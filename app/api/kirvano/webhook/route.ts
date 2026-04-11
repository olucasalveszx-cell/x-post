import { NextRequest, NextResponse } from "next/server";
import { activateEmail } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[kirvano] webhook recebido:", JSON.stringify(body).slice(0, 300));

    // Kirvano envia em vários formatos — tentamos todos
    const email =
      body?.data?.customer?.email ??
      body?.data?.buyer?.email ??
      body?.customer?.email ??
      body?.buyer?.email ??
      body?.email ??
      null;

    const status =
      body?.data?.purchase?.status ??
      body?.data?.order?.status ??
      body?.status ??
      "approved";

    if (!email) {
      console.warn("[kirvano] email não encontrado no payload");
      return NextResponse.json({ ok: false, error: "email not found" }, { status: 400 });
    }

    if (["approved", "complete", "paid", "active"].includes(String(status).toLowerCase())) {
      await activateEmail(email);
      console.log("[kirvano] ativado:", email);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[kirvano] erro:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
