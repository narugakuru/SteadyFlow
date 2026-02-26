import type { NextConfig } from "next";

// Vercel 构建时会自动注入 VERCEL=1，本地自托管需要 standalone 模式
const nextConfig: NextConfig = {
  ...(process.env.VERCEL !== "1" && { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
