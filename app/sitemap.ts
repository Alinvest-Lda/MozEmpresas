import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://moz-empresas.vercel.app";
  const s = await createClient();
  const [businesses, listings, opportunities] = await Promise.all([
    s.from("businesses").select("slug,updated_at").eq("is_public",true).is("archived_at",null).order("updated_at",{ascending:false}).limit(5000),
    s.from("listings").select("id,updated_at").eq("status","PUBLISHED").order("updated_at",{ascending:false}).limit(5000),
    s.from("opportunities").select("slug,updated_at,opens_at,closes_at").eq("status","PUBLISHED").order("updated_at",{ascending:false}).limit(2000),
  ]);
  const now = Date.now();
  return [
    {url:base, lastModified:new Date(), changeFrequency:"daily", priority:1},
    {url:base+"/empresas", lastModified:new Date(), changeFrequency:"daily", priority:0.9},
    {url:base+"/marketplace", lastModified:new Date(), changeFrequency:"daily", priority:0.9},
    {url:base+"/oportunidades", lastModified:new Date(), changeFrequency:"daily", priority:0.8},
    ...(businesses.data??[]).map(x=>({url:base+"/empresas/"+x.slug,lastModified:new Date(x.updated_at),changeFrequency:"weekly" as const,priority:0.7})),
    ...(listings.data??[]).map(x=>({url:base+"/marketplace/"+x.id,lastModified:new Date(x.updated_at),changeFrequency:"weekly" as const,priority:0.65})),
    ...(opportunities.data??[]).filter(x=>(!x.opens_at||new Date(x.opens_at).getTime()<=now)&&(!x.closes_at||new Date(x.closes_at).getTime()>=now)).map(x=>({url:base+"/oportunidades/"+x.slug,lastModified:new Date(x.updated_at),changeFrequency:"daily" as const,priority:0.75})),
  ];
}
