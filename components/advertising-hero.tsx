import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AdvertisingHero() {
  const s=await createClient(); const now=new Date().toISOString();
  const {data}=await s.from("business_promotions").select("id,title,headline,body,image_url,target_url,cta_label,alt_text").eq("status","ACTIVE").eq("placement","HOME").eq("slot","HERO").lte("starts_at",now).gt("ends_at",now).order("created_at",{ascending:false}).limit(1);
  const ad=data?.[0];
  if(!ad) return null;
  return <section className="advertising-hero" aria-label="Publicidade em destaque"><div className="advertising-backdrop is-visible" style={ad.image_url?{backgroundImage:'url("'+ad.image_url+'")'}:undefined} aria-hidden="true"/><div className="container"><div className="advertising-content"><span className="ad-kicker">Publicidade</span><h2>{ad.headline||ad.title}</h2>{ad.body&&<p>{ad.body}</p>}{ad.target_url&&<Link className="ad-cta" href={ad.target_url}>{ad.cta_label||"Saber mais"} <span>→</span></Link>}</div></div></section>;
}