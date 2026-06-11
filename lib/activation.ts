import { createHmac } from "crypto";

const SECRET = process.env.ACTIVATION_SECRET ?? "xpz-secret-fallback";

export function createToken(email: string): string {
  const payload = `${email.toLowerCase()}:${Date.now()}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

export function verifyToken(token: string): { email: string; valid: boolean } {
  try {
    const [enc, sig] = token.split(".");
    const payload = Buffer.from(enc, "base64url").toString();
    const [email, tsStr] = payload.split(":");
    if (Date.now() - Number(tsStr) > 366 * 86400_000) return { email, valid: false };
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
    return { email, valid: sig === expected };
  } catch {
    return { email: "", valid: false };
  }
}
