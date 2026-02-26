import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      role: "admin" | "user";
      plan: "free" | "pro";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: "admin" | "user";
    plan: "free" | "pro";
    password?: string | null;
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "admin" | "user";
    plan?: "free" | "pro";
    remember?: boolean;
  }
}
