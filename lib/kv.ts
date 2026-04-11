// Cliente Upstash Redis via REST (sem pacotes extras)
const URL   = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]) {
  const res = await fetch(`${URL}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

// Marca email como Pro (expira em 1 ano)
export async function activateEmail(email: string) {
  await redis(["set", email.toLowerCase(), "1", "ex", "31536000"]);
}

// Verifica se email tem acesso Pro
export async function isEmailActive(email: string): Promise<boolean> {
  const data = await redis(["get", email.toLowerCase()]);
  return data.result === "1";
}
