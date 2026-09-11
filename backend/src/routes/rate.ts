import { Hono } from "hono";
import { Env } from "../types";

const rate = new Hono<{ Bindings: Env }>();

// GET /rate-card - used by the New Order screen to show a live estimated
// amount as the admin adjusts item counts and service type.
rate.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT item_name, service_type, price FROM rate_card ORDER BY item_name, service_type"
  ).all();
  return c.json({ rate_card: rows.results });
});

export default rate;
