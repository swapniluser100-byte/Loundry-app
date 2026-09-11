import { Hono } from "hono";
import { Env } from "../types";

const pub = new Hono<{ Bindings: Env }>();

// GET /public/order/:orderNumber
// No auth required - this powers the customer-facing tracking page
// (frontend route /o/:orderNumber) that the QR code and email links point to.
// Deliberately returns only customer-safe fields (no phone/email/area/landmark).
pub.get("/order/:orderNumber", async (c) => {
  const orderNumber = c.req.param("orderNumber");

  const row = await c.env.DB.prepare(
    `SELECT o.order_number, o.status, o.service_type, o.items_json, o.amount,
            o.qr_code_url, o.created_at, c.name as customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.order_number = ?`
  )
    .bind(orderNumber)
    .first<Record<string, unknown>>();

  if (!row) return c.json({ error: "Order not found" }, 404);

  const logs = await c.env.DB.prepare(
    `SELECT status, timestamp FROM status_logs
     WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)
     ORDER BY timestamp ASC`
  )
    .bind(orderNumber)
    .all();

  return c.json({
    shop_name: c.env.SHOP_NAME,
    order: { ...row, items: JSON.parse(row.items_json as string) },
    status_history: logs.results,
  });
});

export default pub;
