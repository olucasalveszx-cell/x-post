const BASE  = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function call(command: unknown[]): Promise<any> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await res.json();
  return json.result;
}

export const redisGet    = (key: string): Promise<string | null> => call(["GET", key]);
export const redisSet    = (key: string, value: string): Promise<void> => call(["SET", key, value]);
export const redisIncr   = (key: string): Promise<number> => call(["INCR", key]);
export const redisExpire = (key: string, seconds: number): Promise<void> => call(["EXPIRE", key, seconds]);
export const redisSAdd   = (key: string, member: string): Promise<void> => call(["SADD", key, member]);
export const redisSCard  = (key: string): Promise<number> => call(["SCARD", key]);
export const redisZAdd   = (key: string, score: number, member: string): Promise<void> => call(["ZADD", key, score, member]);
export const redisZCount = (key: string, min: number | "-inf", max: number | "+inf"): Promise<number> => call(["ZCOUNT", key, min, max]);
export const redisZRemRangeByScore = (key: string, min: number | "-inf", max: number): Promise<void> => call(["ZREMRANGEBYSCORE", key, min, max]);

export const redisLPush = (key: string, value: string): Promise<number> => call(["LPUSH", key, value]);
export const redisLTrim = (key: string, start: number, stop: number): Promise<void> => call(["LTRIM", key, start, stop]);
export const redisLRange = (key: string, start: number, stop: number): Promise<string[]> => call(["LRANGE", key, start, stop]);

/** Adiciona item ao fim de uma lista (sem duplicatas via LREM + RPUSH) */
export async function redisListAdd(key: string, value: string): Promise<void> {
  await call(["LREM", key, "0", value]);
  await call(["RPUSH", key, value]);
}

/** Retorna todos os itens da lista */
export const redisListAll = (key: string): Promise<string[]> =>
  call(["LRANGE", key, "0", "-1"]);

export const redisDel  = (key: string): Promise<number> => call(["DEL", key]);
export const redisLRem = (key: string, count: number, value: string): Promise<number> => call(["LREM", key, count, value]);
