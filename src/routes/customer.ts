import { Hono } from "hono";
import { Env } from "../types";

const customer = new Hono<{ Bindings: Env }>();

interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string;
  area: string | null;
  landmark: string | null;
}

function last10Digits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /customer/find?phone=9876543210
customer.get("/find", async (c) => {
  const phone = c.req.query("phone");
  if (!phone) return c.json({ error: "phone query param is required" }, 400);

  const digits = last10Digits(phone);
  if (digits.length !== 10) return c.json({ error: "phone must contain 10 digits" }, 400);

  const row = await c.env.DB.prepare(
    "SELECT id, name, phone, email, area, landmark FROM customers WHERE phone LIKE ?"
  )
    .bind(`%${digits}`)
    .first<CustomerRow>();

  if (!row) return c.json({ found: false });
  return c.json({ found: true, customer: row });
});

// POST /customer/create  { name, phone, email, area?, landmark? }
// Email is required - it is now the only channel used for order
// notifications (see lib/email.ts). Phone stays as the front-desk lookup
// key (that's how staff find a returning customer at drop-off).
// Also acts as an upsert: if the phone already exists, updates the details
// instead of erroring, so the front desk flow ("search, else add") stays
// a single button either way.
customer.post("/create", async (c) => {
  const body = await c.req
    .json<{ name?: string; phone?: string; email?: string; area?: string; landmark?: string }>()
    .catch(() => ({}));
  const { name, phone, email, area, landmark } = body;

  if (!name || !phone || !email) {
    return c.json({ error: "name, phone and email are required" }, 400);
  }
  const digits = last10Digits(phone);
  if (digits.length !== 10) return c.json({ error: "phone must contain 10 digits" }, 400);
  if (!isValidEmail(email)) return c.json({ error: "email is not valid" }, 400);

  const existing = await c.env.DB.prepare("SELECT id FROM customers WHERE phone LIKE ?")
    .bind(`%${digits}`)
    .first<{ id: number }>();

  if (existing) {
    await c.env.DB.prepare("UPDATE customers SET name = ?, email = ?, area = ?, landmark = ? WHERE id = ?")
      .bind(name, email, area || null, landmark || null, existing.id)
      .run();
    const updated = await c.env.DB.prepare(
      "SELECT id, name, phone, email, area, landmark FROM customers WHERE id = ?"
    )
      .bind(existing.id)
      .first<CustomerRow>();
    return c.json({ customer: updated, created: false });
  }

  const created = await c.env.DB.prepare(
    `INSERT INTO customers (name, phone, email, area, landmark) VALUES (?, ?, ?, ?, ?)
     RETURNING id, name, phone, email, area, landmark`
  )
    .bind(name, digits, email, area || null, landmark || null)
    .first<CustomerRow>();

  return c.json({ customer: created, created: true }, 201);
});

export default customer;
