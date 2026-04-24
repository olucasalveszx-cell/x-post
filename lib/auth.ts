import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { verifyPassword } from "@/lib/password";
import { generateOTP, storeOTP, verifyOTP, deleteOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID_2!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_2!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "online",
          response_type: "code",
        },
      },
    }),

    // Provider para verificação OTP após login Google
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp:   { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const emailNorm = credentials.email.toLowerCase().trim();
        const valid = await verifyOTP(emailNorm, credentials.otp);
        if (!valid) return null;

        const raw = await redisGet(`user:${emailNorm}`);
        if (!raw) return null;

        const user = JSON.parse(raw);
        user.verified = true;
        await redisSet(`user:${emailNorm}`, JSON.stringify(user));
        await deleteOTP(emailNorm);

        return { id: emailNorm, email: emailNorm, name: user.name, image: user.picture ?? null };
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",  type: "email" },
        password: { label: "Senha",  type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (
          adminEmail && adminPassword &&
          credentials.email.toLowerCase().trim() === adminEmail &&
          credentials.password === adminPassword
        ) {
          return { id: adminEmail, email: adminEmail, name: "Admin", image: null, role: "admin" } as any;
        }

        const key = `user:${credentials.email.toLowerCase().trim()}`;
        const raw = await redisGet(key);
        if (!raw) return null;

        let user: { name: string; email: string; passwordHash: string };
        try { user = JSON.parse(raw); } catch { return null; }

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.email, email: user.email, name: user.name, image: null };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const emailNorm = user.email.toLowerCase().trim();
        const key = `user:${emailNorm}`;

        // Admin nunca é bloqueado
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        if (adminEmail && emailNorm === adminEmail) return true;

        try {
          const existing = await redisGet(key);

          if (existing) {
            const userData = JSON.parse(existing);
            // Usuários sem campo 'verified' (cadastrados antes desta feature) passam direto
            if (userData.verified !== false) return true;
            // Usuário pendente de verificação — reenviar OTP
            const code = generateOTP();
            await storeOTP(emailNorm, code);
            await sendOTPEmail(emailNorm, code);
            return `/verificar?email=${encodeURIComponent(emailNorm)}`;
          } else {
            // Novo usuário — cadastrar como não verificado e enviar OTP
            const newUser = {
              name: user.name ?? emailNorm.split("@")[0],
              email: emailNorm,
              passwordHash: "",
              createdAt: new Date().toISOString(),
              provider: "google",
              verified: false,
            };
            await redisSet(key, JSON.stringify(newUser));
            await redisListAdd("users:list", emailNorm);
            const code = generateOTP();
            await storeOTP(emailNorm, code);
            await sendOTPEmail(emailNorm, code);
            console.log(`[auth] novo usuário Google (aguarda verificação): ${emailNorm}`);
            return `/verificar?email=${encodeURIComponent(emailNorm)}`;
          }
        } catch (e: any) {
          console.error("[auth] signIn Google erro:", e.message);
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.email   = user.email;
        token.name    = user.name;
        token.picture = (user as any).image ?? null;
        token.role    = (user as any).role ?? "user";
      }
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      if (adminEmail && token.email?.toLowerCase() === adminEmail) {
        token.role = "admin";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name  = token.name  as string;
        session.user.image = (token.picture as string | null) ?? null;
        (session.user as any).role = token.role ?? "user";
      }
      return session;
    },
  },
};
