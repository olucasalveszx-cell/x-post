import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { verifyPassword } from "@/lib/password";

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
    // Auto-registra usuários Google no Redis e dá 4 créditos de boas-vindas
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const emailNorm = user.email.toLowerCase().trim();
        const key = `user:${emailNorm}`;
        try {
          const existing = await redisGet(key);
          if (!existing) {
            const newUser = {
              name: user.name ?? emailNorm.split("@")[0],
              email: emailNorm,
              passwordHash: "",
              createdAt: new Date().toISOString(),
              provider: "google",
            };
            await redisSet(key, JSON.stringify(newUser));
            await redisListAdd("users:list", emailNorm);
            console.log(`[auth] novo usuário Google: ${emailNorm}`);
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
