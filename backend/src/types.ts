export interface Env {
  // Bindings
  DB: D1Database;
  QR_BUCKET: R2Bucket;

  // Plain vars (wrangler.toml [vars])
  SHOP_NAME: string;
  UPI_ID: string;
  UPI_PAYEE_NAME: string;
  EMAIL_PROVIDER: string; // "resend" | "brevo" | "console"
  FROM_EMAIL: string; // verified sender address, e.g. orders@yourlaundry.in
  FROM_NAME: string; // display name for outgoing email, e.g. "Shree Laundry"
  PUBLIC_BASE_URL: string; // Cloudflare Pages frontend URL
  WORKER_BASE_URL: string; // this Worker's own URL
  R2_PUBLIC_URL: string; // optional public URL attached to the R2 bucket

  // Secrets (wrangler secret put ...)
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  BREVO_API_KEY: string;
}

export interface AuthUser {
  sub: string;
  username: string;
  role: string;
}
