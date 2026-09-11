import { Hono } from "hono";
import { Env } from "../types";
import { verifyPassword } from "../lib/password";
import { signJwt } from "../lib/jwt";

const auth = new Hono<{ Bindings: Env }>();

interface LoginBody {
  username?: string;
  password?: string;
}

interface StaffRow {
  id: number;
  username: string;
  password_hash: string;
  role: string;
}

// POST /auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json<LoginBody>().catch(() => ({} as LoginBody));
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: "username and password are required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, username, password_hash, role FROM staff_users WHERE username = ?"
  )
    .bind(username)
    .first<StaffRow>();

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signJwt(
    { sub: String(user.id), username: user.username, role: user.role },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
    shop_name: c.env.SHOP_NAME,
  });
});

export default auth;
