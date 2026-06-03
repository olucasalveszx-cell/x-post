import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Se CRON_SECRET estiver configurado, valida o header — senão, deixa passar
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://xpostzone.online";
  try {
    const res = await fetch(`${base}/api/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao processar cron" }, { status: 500 });
  }
}
