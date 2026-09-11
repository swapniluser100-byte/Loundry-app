import { MiddlewareHandler } from "hono";
import { Env, AuthUser } from "../types";
import { verifyJwt } from "../lib/jwt";

type Vars = { user: AuthUser };

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const payload = await verifyJwt<AuthUser>(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("user", payload);
  await next();
};
