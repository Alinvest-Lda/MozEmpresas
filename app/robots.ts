import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://moz-empresas.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/empresas/", "/marketplace/", "/oportunidades/"], disallow: ["/dashboard/", "/parceiro/", "/admin/", "/login", "/registo"] }],
    sitemap: base + "/sitemap.xml",
    host: base,
  };
}
