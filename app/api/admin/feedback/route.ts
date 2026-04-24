import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { redisGet, redisSet, redisListAll, redisLPush, redisLTrim } from "@/lib/redis";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

function isAdmin(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  return verifyAdminToken(token);
}

async function pushUserNotif(email: string, notif: object) {
  await redisLPush(`user:notifs:${email}`, JSON.stringify(notif));
  await redisLTrim(`user:notifs:${email}`, 0, 49);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ids = await redisListAll("feedbacks:list");
  const items = await Promise.all(
    ids.map(async (id) => {
      const raw = await redisGet(`feedback:${id}`);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    })
  );

  return NextResponse.json({ feedbacks: items.filter(Boolean) });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, action, reply, status } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const raw = await redisGet(`feedback:${id}`);
  if (!raw) return NextResponse.json({ error: "Feedback não encontrado" }, { status: 404 });

  let item: any;
  try { item = JSON.parse(raw); } catch { return NextResponse.json({ error: "Dados inválidos" }, { status: 500 }); }

  const userEmail: string = item.userEmail;

  if (action === "reply") {
    item.adminReply = reply ?? "";
    item.status = "replied";
    await redisSet(`feedback:${id}`, JSON.stringify(item));

    const isIdea = item.type === "update_idea";
    await pushUserNotif(userEmail, {
      id: uuid(),
      type: "feedback_reply",
      title: isIdea ? "Admin respondeu sua ideia" : "Admin respondeu seu feedback",
      body: reply ?? "",
      originalText: item.text?.slice(0, 120),
      createdAt: new Date().toISOString(),
    });

  } else if (action === "status") {
    const newStatus = status ?? item.status;
    item.status = newStatus;
    await redisSet(`feedback:${id}`, JSON.stringify(item));

    if (newStatus === "approved") {
      await pushUserNotif(userEmail, {
        id: uuid(),
        type: "idea_approved",
        title: "Sua ideia foi aprovada!",
        body: "Ótima sugestão! Vamos trabalhar nessa melhoria.",
        originalText: item.text?.slice(0, 120),
        createdAt: new Date().toISOString(),
      });
    } else if (newStatus === "rejected") {
      await pushUserNotif(userEmail, {
        id: uuid(),
        type: "idea_rejected",
        title: "Ideia recebida",
        body: "Obrigado pela sugestão! No momento não está nos planos, mas continuamos acompanhando.",
        originalText: item.text?.slice(0, 120),
        createdAt: new Date().toISOString(),
      });
    }
  } else {
    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, item });
}
