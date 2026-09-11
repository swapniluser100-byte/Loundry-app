import { Hono } from "hono";
import { Env } from "../types";

const qrServe = new Hono<{ Bindings: Env }>();

// GET /qr/:key - fallback public image host for R2 objects when no
// R2.dev / custom domain is configured (see lib/r2.ts). `key` may contain
// slashes (e.g. orders/PN-LND-2026-000123.svg), so we match greedily with
// Hono's regex param syntax rather than a plain named param.
qrServe.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  if (!key) return c.text("Not found", 404);

  const object = await c.env.QR_BUCKET.get(key);
  if (!object) return c.text("Not found", 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default qrServe;
