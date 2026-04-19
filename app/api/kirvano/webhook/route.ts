import { NextRequest, NextResponse } from "next/server";
import { setEmailPlan } from "@/lib/kv";

const PLAN_MAP: Record<string, string> = {
  "d3f6da72-a6be-4d54-8268-20c725e4ab5b": "basic",
  "e5bdb60b-3d05-4338-bbb7-59e17b1b636f": "pro",
  "2aca1343-9b14-48d4-aedc-8f532b509abd": "business",
};

function detectPlan(body: any): string {
  // Formato real da Kirvano: products[0].offer_id
  const offerId =
    body?.products?.[0]?.offer_id ??
    body?.data?.purchase?.offer?.id ??
    body?.data?.offer?.id ??
    body?.data?.product?.id ??
    body?.offer_id ??
    body?.product_id ??
    null;

  if (offerId && PLAN_MAP[offerId]) return PLAN_MAP[offerId];

  // Fallback por nome da oferta
  const name: string = (
    body?.products?.[0]?.offer_name ??
    body?.products?.[0]?.name ??
    body?.data?.purchase?.offer?.name ??
    body?.data?.offer?.name ??
    body?.offer_name ??
    ""
  ).toLowerCase();

  if (name.includes("business") || name.includes("empresa")) return "business";
  if (name.includes("pro"))                                    return "pro";
  if (name.includes("basic") || name.includes("básico"))       return "basic";

  return "basic"; // padrão seguro (plano mais barato)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[kirvano] webhook recebido:", JSON.stringify(body).slice(0, 500));

    // Email do cliente — formato real da Kirvano: customer.email
    const email: string | null =
      body?.customer?.email ??
      body?.data?.customer?.email ??
      body?.data?.buyer?.email ??
      body?.buyer?.email ??
      body?.email ??
      null;

    if (!email) {
      console.warn("[kirvano] email não encontrado no payload");
      return NextResponse.json({ ok: false, error: "email not found" }, { status: 400 });
    }

    // Status — formato real da Kirvano: event=SALE_APPROVED, status=APPROVED
    const event  = String(body?.event  ?? "").toUpperCase();
    const status = String(body?.status ?? "").toUpperCase();

    const isActive =
      event  === "SALE_APPROVED" ||
      event  === "SUBSCRIPTION_ACTIVE" ||
      status === "APPROVED" ||
      status === "ACTIVE";

    if (isActive) {
      const plan = detectPlan(body);
      await setEmailPlan(email.toLowerCase().trim(), plan);
      console.log(`[kirvano] ativado: ${email} → plano ${plan}`);
    } else {
      console.log(`[kirvano] evento ignorado (event: ${event}, status: ${status})`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[kirvano] erro:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
