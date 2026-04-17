import { createPrivateKey, sign } from "crypto";

function base64UrlEncode(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createRs256Jwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string
) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign("RSA-SHA256", Buffer.from(data), createPrivateKey(privateKeyPem));
  return `${data}.${base64UrlEncode(signature)}`;
}
