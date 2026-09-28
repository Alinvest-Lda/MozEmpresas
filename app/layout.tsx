import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "MozEmpresas — Ecossistema empresarial de Moçambique",
  description: "Descubra empresas, produtos, serviços, concursos e oportunidades em Moçambique.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body>
        <Header />
        {children}
        <Footer />      </body>
    </html>
  );
}