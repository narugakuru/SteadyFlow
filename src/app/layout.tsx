import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AppSessionProvider } from "@/components/session-provider";
import { DisciplineNotesFab } from "@/components/discipline-notes-fab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "资产组合管理",
  description: "个人投资组合纪律交易管理工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppSessionProvider>
          <Navbar />
          {children}
          <DisciplineNotesFab />
        </AppSessionProvider>
      </body>
    </html>
  );
}
