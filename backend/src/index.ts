import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env, AuthUser } from "./types";

import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customer";
import orderRoutes from "./routes/order";
import paymentRoutes from "./routes/payment";
import rateRoutes from "./routes/rate";
import qrServeRoutes from "./routes/qrserve";
import publicRoutes from "./routes/public";
import { requireAuth } from "./middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.use(
  "*",
  cors({
    origin: "*", // restrict to your Pages domain in production
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.get("/", (c) => c.json({ ok: true, service: "laundry-backend", shop: c.env.SHOP_NAME }));

// -- Public routes (no JWT required) ---------------------------------------
app.route("/auth", authRoutes);
app.route("/qr", qrServeRoutes);
app.route("/public", publicRoutes);

// -- Protected routes (staff JWT required) ---------------------------------
app.use("/customer/*", requireAuth);
app.use("/order/*", requireAuth);
app.use("/payment/*", requireAuth);
app.use("/rate-card", requireAuth);
app.use("/rate-card/*", requireAuth);

app.route("/customer", customerRoutes);
app.route("/order", orderRoutes);
app.route("/payment", paymentRoutes);
app.route("/rate-card", rateRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

export default app;
