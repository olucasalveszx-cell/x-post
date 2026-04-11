const BASE  = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function call(command: string[]): Promise<any> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await res.json();
  return json.result;
}

export const redisGet = (key: string): Promise<string | null> =>
  call(["GET", key]);

export const redisSet = (key: string, value: string): Promise<void> =>
  call(["SET", key, value]);
