import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { redisGet } from "@/lib/redis";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Permite que o mesmo e-mail seja usado com Google e Credentials
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          // Força sempre a tela de seleção de conta (evita loop em mobile)
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

        // Verifica se é o admin
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (
          adminEmail && adminPassword &&
          credentials.email.toLowerCase().trim() === adminEmail &&
          credentials.password === adminPassword
        ) {
          return { id: adminEmail, email: adminEmail, name: "Admin", image: null, role: "admin" } as any;
        }

        // Usuário comum via Redis
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

  // Cookies explícitos melhoram compatibilidade com Safari/iOS
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email   = user.email;
        token.name    = user.name;
        token.picture = (user as any).image ?? null;
        token.role    = (user as any).role ?? "user";
      }
      // Admin pelo email — funciona com Google e credentials
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
