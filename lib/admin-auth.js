import crypto from "node:crypto";

export const ADMIN_COOKIE_NAME = "securecourse-admin-session";

const SESSION_MAX_AGE = 60 * 60 * 12;

function asBuffer(value) {
  return Buffer.from(String(value || ""));
}

function safeEqual(left, right) {
  const leftBuffer = asBuffer(left);
  const rightBuffer = asBuffer(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export function validateAdminCredentials(username, password) {
  if (!isAdminConfigured()) {
    return false;
  }

  return (
    safeEqual(username, process.env.ADMIN_USERNAME) &&
    safeEqual(password, process.env.ADMIN_PASSWORD)
  );
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD || "missing-admin-password")
    .update(payload)
    .digest("base64url");
}

export function createAdminSessionValue() {
  const issuedAt = Date.now().toString();
  const username = process.env.ADMIN_USERNAME || "admin";
  const payload = `${username}.${issuedAt}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyAdminSessionValue(value) {
  if (!value || !isAdminConfigured()) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [username, issuedAt, signature] = parts;

  if (!safeEqual(username, process.env.ADMIN_USERNAME)) {
    return false;
  }

  const issuedAtNumber = Number(issuedAt);

  if (!Number.isFinite(issuedAtNumber)) {
    return false;
  }

  if (Date.now() - issuedAtNumber > SESSION_MAX_AGE * 1000) {
    return false;
  }

  const payload = `${username}.${issuedAt}`;
  return safeEqual(signature, signPayload(payload));
}

export function getAdminCookieOptions(request) {
  const hostname = request ? new URL(request.url).hostname : "";
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isLocalHost,
    path: "/",
    maxAge: SESSION_MAX_AGE
  };
}

export function requireAdminFromRequest(request) {
  const sessionValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifyAdminSessionValue(sessionValue)) {
    const error = new Error("Admin authorization is required.");
    error.statusCode = 401;
    throw error;
  }
}
