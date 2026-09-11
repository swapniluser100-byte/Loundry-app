import { Env } from "../types";

/**
 * Uploads an SVG QR code to R2 and returns a publicly reachable URL.
 *
 * Two hosting options are supported:
 *  1. R2_PUBLIC_URL set (an R2.dev public bucket URL, or a custom domain
 *     mapped to the bucket) -> the object is served directly by R2/Cloudflare.
 *  2. R2_PUBLIC_URL empty -> the object is streamed back through this same
 *     Worker at GET /qr/:key (see src/routes/qrserve.ts). This avoids any
 *     extra Cloudflare configuration for a first deployment.
 */
export async function uploadQrToR2(env: Env, key: string, svgContent: string): Promise<string> {
  await env.QR_BUCKET.put(key, svgContent, {
    httpMetadata: { contentType: "image/svg+xml" },
  });

  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  return `${env.WORKER_BASE_URL.replace(/\/$/, "")}/qr/${key}`;
}

export async function getQrFromR2(env: Env, key: string): Promise<R2ObjectBody | null> {
  return env.QR_BUCKET.get(key);
}
