import { createHash, randomBytes } from "crypto";

export function createOneTimeToken() {
  return randomBytes(16).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
