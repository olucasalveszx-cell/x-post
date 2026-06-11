import { redisGet, redisSet, redisExpire } from "@/lib/redis";

const OTP_TTL = 600; // 10 minutos

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(email: string, code: string) {
  const key = `otp:${email.toLowerCase().trim()}`;
  await redisSet(key, code);
  await redisExpire(key, OTP_TTL);
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const key = `otp:${email.toLowerCase().trim()}`;
  const stored = await redisGet(key);
  return stored !== null && stored === code;
}

export async function deleteOTP(email: string) {
  const key = `otp:${email.toLowerCase().trim()}`;
  await redisSet(key, "");
  await redisExpire(key, 1);
}
