import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db";
import { authAccounts, sessions, users, verificationTokens } from "@/db/schema";

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24;
const REMEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as any) as any,
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_SESSION_MAX_AGE,
  },
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;
        if (!email || !password) {
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        const remember = credentials?.remember === "true" || credentials?.remember === "on";

        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          image: user.image ?? null,
          role: user.role ?? "user",
          plan: user.plan ?? "free",
          remember,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const remember = typeof (user as { remember?: boolean }).remember === "boolean"
          ? (user as { remember?: boolean }).remember
          : false;

        token.userId = (user as { id?: string }).id ?? token.sub;
        token.role = (user as { role?: "admin" | "user" }).role ?? "user";
        token.plan = (user as { plan?: "free" | "pro" }).plan ?? "free";
        token.remember = remember;
        const maxAge = remember ? REMEMBER_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }

      if (!token.userId && token.sub) {
        token.userId = token.sub;
      }

      return token;
    },
    async session({ session, token }) {
      const userId = token.userId ?? token.sub;
      if (userId) {
        session.user = {
          ...session.user,
          id: userId,
          role: (token.role as "admin" | "user") ?? "user",
          plan: (token.plan as "free" | "pro") ?? "free",
        };
      }

      if (token.exp) {
        session.expires = new Date(token.exp * 1000).toISOString() as unknown as Date & string;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
