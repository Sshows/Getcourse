/**
 * Edge-compatible admin session verification.
 * Uses Web Crypto API instead of node:crypto — safe for middleware and Edge Runtime.
 * Only contains the cookie name and the verify function needed by middleware.
 */

export const ADMIN_COOKIE_NAME = "securecourse-admin-session";

const SESSION_MAX_AGE_MS = 60 * 60 * 12 * 1000; // 12 hours

async function getHmacKey(secret) {
  const keyData = new TextEncoder().encode(secret || "missing-admin-password");
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayloadEdge(payload, secret) {
  const key = await getHmacKey(secret);
  const data = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  // base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeStringEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  // Simple constant-time-ish compare (no timing attacks via length since already equal length)
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyAdminSessionValueEdge(value) {
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME;

  if (!value || !password || !username) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [tokenUsername, issuedAt, signature] = parts;

  if (!timingSafeStringEqual(tokenUsername, username)) {
    return false;
  }

  const issuedAtNumber = Number(issuedAt);

  if (!Number.isFinite(issuedAtNumber)) {
    return false;
  }

  if (Date.now() - issuedAtNumber > SESSION_MAX_AGE_MS) {
    return false;
  }

  const payload = `${tokenUsername}.${issuedAt}`;
  const expectedSignature = await signPayloadEdge(payload, password);

  return timingSafeStringEqual(signature, expectedSignature);
}
