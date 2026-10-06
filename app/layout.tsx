import type { Metadata } from "next";
import "./globals.css";
import "./dashboard/dashboard-ux.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getCurrentAccountContext } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MozEmpresas — Ecossistema empresarial de Moçambique",
  description: "Descubra empresas, produtos, serviços, concursos e oportunidades em Moçambique.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, accountType } = await getCurrentAccountContext();

  return (
    <html lang="pt-MZ">
      <body>
        <Header initialSignedIn={Boolean(user)} initialAccountType={accountType} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
