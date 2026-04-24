import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendOTPEmail(to: string, code: string) {
  await resend.emails.send({
    from: "xPost <onboarding@resend.dev>",
    to,
    subject: "Seu código de verificação — xPost",
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:40px 32px;background:#0a0a0a;color:#fff;border-radius:16px">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">xPost</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;color:#fff">Confirme seu login</h2>
        <p style="color:#888;margin:0 0 28px;font-size:14px">Use o código abaixo para verificar sua conta. Ele expira em <strong style="color:#fff">10 minutos</strong>.</p>
        <div style="background:#1a1a2e;border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:28px;text-align:center">
          <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#fff;font-variant-numeric:tabular-nums">${code}</span>
        </div>
        <p style="color:#555;font-size:12px;margin:24px 0 0">Se você não tentou entrar no xPost, ignore este e-mail.</p>
      </div>
    `,
  });
}
