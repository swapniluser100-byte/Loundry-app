import { Hono } from "hono";
import { Env } from "../types";
import { generateQrSvg } from "../lib/qr";
import { uploadQrToR2 } from "../lib/r2";
import { sendEmail, buildEmail, EmailTemplateKey } from "../lib/email";

const order = new Hono<{ Bindings: Env }>();

type ItemCounts = Record<string, number>;

const VALID_STATUSES = ["Received", "In Progress", "Ready for Pickup", "Handed Over"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const STATUS_TEMPLATE_KEY: Record<OrderStatus, EmailTemplateKey | null> = {
  Received: null, // sent separately at creation time
  "In Progress": "in_progress",
  "Ready for Pickup": "ready",
  "Handed Over": "handed_over",
};

/** Atomically allocates the next sequence number for the current year and
 * formats it as PN-LND-<year>-<6 digit seq>, e.g. PN-LND-2026-000123.
 * The UPSERT + RETURNING runs as a single SQLite statement, so it stays
 * correct even if two orders are created at nearly the same moment. */
async function nextOrderNumber(env: Env): Promise<string> {
  const year = new Date().getFullYear();
  const row = await env.DB.prepare(
    `INSERT INTO order_counters (year, last_seq) VALUES (?, 1)
     ON CONFLICT(year) DO UPDATE SET last_seq = last_seq + 1
     RETURNING last_seq`
  )
    .bind(year)
    .first<{ last_seq: number }>();
  const seq = row!.last_seq;
  return `PN-LND-${year}-${String(seq).padStart(6, "0")}`;
}

async function calcAmount(env: Env, items: ItemCounts, serviceType: string): Promise<number> {
  let total = 0;
  for (const [itemName, qty] of Object.entries(items)) {
    if (!qty) continue;
    const rate = await env.DB.prepare(
      "SELECT price FROM rate_card WHERE item_name = ? AND service_type = ?"
    )
      .bind(itemName, serviceType)
      .first<{ price: number }>();
    if (rate) total += rate.price * qty;
  }
  return Math.round(total * 100) / 100;
}

function trackUrlFor(env: Env, orderNumber: string): string {
  return `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/o/${orderNumber}`;
}

// POST /order/create  { customer_id, items: {shirt:2, pant:1, ...}, service_type }
order.post("/create", async (c) => {
  const body = await c.req
    .json<{ customer_id?: number; items?: ItemCounts; service_type?: string }>()
    .catch(() => ({}));
  const { customer_id, items, service_type } = body;

  if (!customer_id || !items || !service_type) {
    return c.json({ error: "customer_id, items and service_type are required" }, 400);
  }
  if (!["Wash", "Iron", "Dry Clean"].includes(service_type)) {
    return c.json({ error: "service_type must be Wash, Iron or Dry Clean" }, 400);
  }
  const totalItems = Object.values(items).reduce((a, b) => a + (Number(b) || 0), 0);
  if (totalItems <= 0) {
    return c.json({ error: "At least one item quantity is required" }, 400);
  }

  const customerRow = await c.env.DB.prepare("SELECT id, name, email FROM customers WHERE id = ?")
    .bind(customer_id)
    .first<{ id: number; name: string; email: string }>();
  if (!customerRow) return c.json({ error: "Customer not found" }, 404);

  const orderNumber = await nextOrderNumber(c.env);
  const estimatedAmount = await calcAmount(c.env, items, service_type);

  const created = await c.env.DB.prepare(
    `INSERT INTO orders (order_number, customer_id, items_json, service_type, amount, status)
     VALUES (?, ?, ?, ?, ?, 'Received')
     RETURNING id, order_number, customer_id, items_json, service_type, amount, status, created_at`
  )
    .bind(orderNumber, customer_id, JSON.stringify(items), service_type, estimatedAmount)
    .first<{ id: number; order_number: string }>();

  await c.env.DB.prepare("INSERT INTO status_logs (order_id, status) VALUES (?, 'Received')")
    .bind(created!.id)
    .run();

  const trackUrl = trackUrlFor(c.env, orderNumber);
  const svg = await generateQrSvg(trackUrl);
  const qrUrl = await uploadQrToR2(c.env, `orders/${orderNumber}.svg`, svg);

  await c.env.DB.prepare("UPDATE orders SET qr_code_url = ? WHERE id = ?")
    .bind(qrUrl, created!.id)
    .run();

  const content = buildEmail(c.env, "received", { orderNumber, trackUrl, qrCodeUrl: qrUrl });
  const emailResult = await sendEmail(c.env, customerRow.email, content);

  return c.json(
    {
      order: { ...created, qr_code_url: qrUrl, track_url: trackUrl, items },
      email: emailResult,
    },
    201
  );
});

// POST /order/update-status  { order_number, status, amount? }
order.post("/update-status", async (c) => {
  const body = await c.req
    .json<{ order_number?: string; status?: string; amount?: number }>()
    .catch(() => ({}));
  const { order_number, status, amount } = body;

  if (!order_number || !status) {
    return c.json({ error: "order_number and status are required" }, 400);
  }
  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return c.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT o.id, o.order_number, o.status as current_status, o.qr_code_url, c.email as customer_email
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.order_number = ?`
  )
    .bind(order_number)
    .first<{
      id: number;
      order_number: string;
      current_status: string;
      qr_code_url: string | null;
      customer_email: string;
    }>();

  if (!existing) return c.json({ error: "Order not found" }, 404);

  if (typeof amount === "number") {
    await c.env.DB.prepare(
      "UPDATE orders SET status = ?, amount = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(status, amount, existing.id)
      .run();
  } else {
    await c.env.DB.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, existing.id)
      .run();
  }

  await c.env.DB.prepare("INSERT INTO status_logs (order_id, status) VALUES (?, ?)")
    .bind(existing.id, status)
    .run();

  const templateKey = STATUS_TEMPLATE_KEY[status as OrderStatus];
  let emailResult = null;
  if (templateKey) {
    const trackUrl = trackUrlFor(c.env, order_number);
    const content = buildEmail(c.env, templateKey, {
      orderNumber: order_number,
      trackUrl,
      qrCodeUrl: existing.qr_code_url || undefined,
    });
    emailResult = await sendEmail(c.env, existing.customer_email, content);
  }

  const updated = await c.env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(existing.id).first();
  return c.json({ order: updated, email: emailResult });
});

// GET /order/get-by-qr?data=<scanned QR text or raw order number>
// Used by the pickup/scan screen: the QR encodes the customer tracking URL
// (https://.../o/PN-LND-2026-000123), so we pull the order number back out
// of whatever text the camera decoded.
order.get("/get-by-qr", async (c) => {
  const raw = c.req.query("data") || c.req.query("order_number");
  if (!raw) return c.json({ error: "data or order_number query param is required" }, 400);

  const match = raw.match(/PN-LND-\d{4}-\d{6}/);
  const orderNumber = match ? match[0] : raw.trim();

  const row = await c.env.DB.prepare(
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.area, c.landmark
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.order_number = ?`
  )
    .bind(orderNumber)
    .first<Record<string, unknown>>();

  if (!row) return c.json({ error: "Order not found" }, 404);

  const logs = await c.env.DB.prepare(
    "SELECT status, timestamp FROM status_logs WHERE order_id = ? ORDER BY timestamp ASC"
  )
    .bind(row.id as number)
    .all();

  return c.json({
    order: { ...row, items: JSON.parse(row.items_json as string) },
    status_history: logs.results,
  });
});

// GET /order/list?status=Received&q=search+text&limit=50
// `q` matches against order number, customer name, or customer phone - used
// by the Orders screen's search box. `status` and `q` can be combined.
order.get("/list", async (c) => {
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim();
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);

  let query = `SELECT o.id, o.order_number, o.status, o.amount, o.service_type, o.items_json,
                      o.created_at, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
               FROM orders o JOIN customers c ON c.id = o.customer_id`;
  const conditions: string[] = [];
  const binds: unknown[] = [];

  if (status) {
    conditions.push("o.status = ?");
    binds.push(status);
  }
  if (q) {
    conditions.push("(o.order_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)");
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY o.created_at DESC LIMIT ?";
  binds.push(limit);

  const rows = await c.env.DB.prepare(query)
    .bind(...binds)
    .all<Record<string, unknown>>();

  const orders = rows.results.map((r) => ({ ...r, items: JSON.parse(r.items_json as string) }));
  return c.json({ orders });
});

// GET /order/stats
// Feeds the Dashboard overview screen: today's and all-time order counts and
// revenue, plus a count per status. "Revenue" counts only Handed Over orders
// (i.e. orders that have actually been paid and collected).
order.get("/stats", async (c) => {
  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) as order_count,
            COALESCE(SUM(CASE WHEN status = 'Handed Over' THEN amount ELSE 0 END), 0) as revenue
     FROM orders`
  ).first<{ order_count: number; revenue: number }>();

  const today = await c.env.DB.prepare(
    `SELECT COUNT(*) as order_count,
            COALESCE(SUM(CASE WHEN status = 'Handed Over' THEN amount ELSE 0 END), 0) as revenue
     FROM orders WHERE date(created_at) = date('now')`
  ).first<{ order_count: number; revenue: number }>();

  const statusRows = await c.env.DB.prepare(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`).all<{
    status: string;
    count: number;
  }>();

  const by_status: Record<string, number> = {
    Received: 0,
    "In Progress": 0,
    "Ready for Pickup": 0,
    "Handed Over": 0,
  };
  for (const row of statusRows.results) {
    by_status[row.status] = row.count;
  }

  const recent = await c.env.DB.prepare(
    `SELECT o.order_number, o.status, o.amount, o.created_at, c.name as customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC LIMIT 5`
  ).all();

  return c.json({
    today: { orders: today?.order_count ?? 0, revenue: today?.revenue ?? 0 },
    totals: { orders: totals?.order_count ?? 0, revenue: totals?.revenue ?? 0 },
    by_status,
    recent_orders: recent.results,
  });
});

export default order;
