#!/usr/bin/env node
// Generates a password hash in the exact same format used by
// src/lib/password.ts (pbkdf2$<iterations>$<saltB64>$<hashB64>), using
// Node's Web Crypto implementation so it is byte-for-byte compatible with
// the Worker's runtime verification.
//
// Usage:
//   node scripts/hash-password.mjs "MyNewPassword123"
//
// Then insert the printed hash into the staff_users table, e.g.:
//   wrangler d1 execute laundry_db --remote --command \
//     "INSERT INTO staff_users (username, password_hash, role) VALUES ('admin2', '<hash>', 'admin');"

import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function pbkdf2(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const hash = await hashPassword(password);
console.log(hash);
