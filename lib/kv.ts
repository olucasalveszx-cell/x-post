// Cliente Upstash Redis via REST (sem pacotes extras)
const URL   = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(cmd: string[]) {
  const res = await fetch(`${URL}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

// Marca email como ativo (expira em 1 ano)
export async function activateEmail(email: string) {
  await redis(["set", `kv:${email.toLowerCase()}`, "1", "ex", "31536000"]);
}

// Verifica se email tem acesso ativo
export async function isEmailActive(email: string): Promise<boolean> {
  const data = await redis(["get", `kv:${email.toLowerCase()}`]);
  return data.result === "1";
}

// Salva plano do usuário (expira em 1 ano)
export async function setEmailPlan(email: string, plan: string) {
  const key = email.toLowerCase();
  await Promise.all([
    redis(["set", `kv:${key}`, "1", "ex", "31536000"]),          // compatibilidade
    redis(["set", `plan:${key}`, plan, "ex", "31536000"]),
    redis(["del", `plan_cache:${key}`]),                           // invalida cache
  ]);
}

// Retorna plano do usuário (null = não encontrado)
export async function getEmailPlan(email: string): Promise<string | null> {
  const data = await redis(["get", `plan:${email.toLowerCase()}`]);
  return (data.result as string | null) ?? null;
}
