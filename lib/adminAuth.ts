import { createHmac, timingSafeEqual } from "crypto";

const SECRET = () => process.env.NEXTAUTH_SECRET!;

/* ── Verifica se as credenciais batem com as do env ── */
export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail    = process.env.ADMIN_EMAIL ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!adminEmail || !adminPassword) return false;

  // Compara via HMAC para evitar timing attacks
  const hmac = (v: string) =>
    createHmac("sha256", SECRET()).update(v).digest();

  try {
    const emailMatch = timingSafeEqual(
      hmac(email.toLowerCase().trim()),
      hmac(adminEmail.toLowerCase().trim()),
    );
    const pwMatch = timingSafeEqual(hmac(password), hmac(adminPassword));
    return emailMatch && pwMatch;
  } catch {
    return false;
  }
}

/* ── Gera token assinado (válido por 8h) ── */
export function createAdminToken(): string {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + 8 * 60 * 60 * 1000 });
  const b64     = Buffer.from(payload).toString("base64url");
  const sig     = createHmac("sha256", SECRET()).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

/* ── Verifica token ── */
export function verifyAdminToken(token: string): boolean {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return false;

    const expectedSig = createHmac("sha256", SECRET()).update(b64).digest("hex");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;

    const data = JSON.parse(Buffer.from(b64, "base64url").toString());
    return data.admin === true && data.exp > Date.now();
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE = "xpz_admin";
