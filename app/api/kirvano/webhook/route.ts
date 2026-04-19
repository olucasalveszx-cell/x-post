import { NextRequest, NextResponse } from "next/server";
import { setEmailPlan } from "@/lib/kv";

// Mapeia offer/product ID para plano
const PLAN_MAP: Record<string, string> = {
  "d3f6da72-a6be-4d54-8268-20c725e4ab5b": "basic",
  "e5bdb60b-3d05-4338-bbb7-59e17b1b636f": "pro",
  "2aca1343-9b14-48d4-aedc-8f532b509abd": "business",
};

function detectPlan(body: any): string {
  const offerId =
    body?.data?.purchase?.offer?.id ??
    body?.data?.offer?.id ??
    body?.data?.product?.id ??
    body?.offer_id ??
    body?.product_id ??
    null;

  if (offerId && PLAN_MAP[offerId]) return PLAN_MAP[offerId];

  // Fallback: detecta pelo nome do produto
  const name: string = (
    body?.data?.purchase?.offer?.name ??
    body?.data?.offer?.name ??
    body?.data?.product?.name ??
    body?.offer_name ??
    ""
  ).toLowerCase();

  if (name.includes("business") || name.includes("empresa")) return "business";
  if (name.includes("pro"))                                    return "pro";
  if (name.includes("basic") || name.includes("básico"))       return "basic";

  return "pro"; // padrão se não identificado
}

export async function POST(req: NextRequest) {
  try {
    // Validação do token (configurado em KIRVANO_WEBHOOK_TOKEN)
    const expectedToken = process.env.KIRVANO_WEBHOOK_TOKEN;
    if (expectedToken) {
      const receivedToken =
        req.headers.get("Authorization") ??
        req.headers.get("x-kirvano-token") ??
        req.headers.get("token") ??
        null;
      if (receivedToken !== expectedToken) {
        console.warn("[kirvano] token inválido");
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    console.log("[kirvano] webhook:", JSON.stringify(body).slice(0, 400));

    // Extrai email do cliente
    const email: string | null =
      body?.data?.customer?.email ??
      body?.data?.buyer?.email ??
      body?.customer?.email ??
      body?.buyer?.email ??
      body?.email ??
      null;

    if (!email) {
      console.warn("[kirvano] email não encontrado no payload");
      return NextResponse.json({ ok: false, error: "email not found" }, { status: 400 });
    }

    // Extrai status da compra
    const status: string = String(
      body?.data?.purchase?.status ??
      body?.data?.order?.status ??
      body?.event ??
      body?.status ??
      "approved"
    ).toLowerCase();

    const isActive = ["approved", "complete", "paid", "active", "purchase.approved", "subscription.active"].some(
      (s) => status.includes(s)
    );

    if (isActive) {
      const plan = detectPlan(body);
      await setEmailPlan(email.toLowerCase().trim(), plan);
      console.log(`[kirvano] ativado: ${email} → plano ${plan}`);
    } else {
      console.log(`[kirvano] evento ignorado (status: ${status})`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[kirvano] erro:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
