import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles/tokens.css";
import "./globals.css";
import "./styles/components.css";
import "./dashboard/dashboard-ux.css";
import { PublicShell } from "@/components/shells/public-shell";
import { getCurrentAccountContext } from "@/lib/auth/access";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://moz-empresas.vercel.app"),
  title: "MozEmpresas — Ecossistema empresarial de Moçambique",
  description: "Descubra empresas, produtos, serviços e oportunidades em Moçambique.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, accountType } = await getCurrentAccountContext();

  return (
    <html lang="pt-MZ">
      <body className={inter.variable}>
        <PublicShell initialSignedIn={Boolean(user)} initialAccountType={accountType}>{children}</PublicShell>
      </body>
    </html>
  );
}
