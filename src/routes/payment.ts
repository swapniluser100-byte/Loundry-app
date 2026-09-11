import { Hono } from "hono";
import { Env } from "../types";
import { buildUpiUri } from "../lib/upi";
import { generateQrSvg, svgToDataUri } from "../lib/qr";

const payment = new Hono<{ Bindings: Env }>();

// POST /payment/generate-upi-qr  { order_number, amount }
// Called from the pickup screen once the admin has entered/confirmed the
// final bill amount. Persists the final amount on the order and returns a
// ready-to-display UPI QR code (as an inline SVG data URI - no R2 round
// trip needed since this QR is single-use and shown immediately).
payment.post("/generate-upi-qr", async (c) => {
  const body = await c.req.json<{ order_number?: string; amount?: number }>().catch(() => ({}));
  const { order_number, amount } = body;

  if (!order_number || typeof amount !== "number" || amount <= 0) {
    return c.json({ error: "order_number and a positive numeric amount are required" }, 400);
  }

  const orderRow = await c.env.DB.prepare("SELECT id FROM orders WHERE order_number = ?")
    .bind(order_number)
    .first<{ id: number }>();
  if (!orderRow) return c.json({ error: "Order not found" }, 404);

  await c.env.DB.prepare("UPDATE orders SET amount = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(amount, orderRow.id)
    .run();

  const upiUri = buildUpiUri({
    pa: c.env.UPI_ID,
    pn: c.env.UPI_PAYEE_NAME || c.env.SHOP_NAME,
    am: amount,
    tn: `Laundry ${order_number}`,
  });

  const svg = await generateQrSvg(upiUri, { width: 280 });
  const qrDataUri = svgToDataUri(svg);

  return c.json({ order_number, amount, upi_uri: upiUri, qr_data_uri: qrDataUri });
});

export default payment;
