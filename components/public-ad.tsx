import { createClient } from "@/lib/supabase/server";

type Ad={id:string;title:string;body:string|null;image_url:string|null;target_url:string|null;cta_label:string|null;alt_text:string|null;placement:string;slot:string;source:string};

export async function PublicAd({surface,slot="BILLBOARD",className=""}:{surface:"HOME"|"DIRECTORY"|"MARKETPLACE"|"OPPORTUNITIES";slot?:string;className?:string}){
 const s=await createClient(); const now=new Date().toISOString();
 const {data}=await s.from("business_promotions").select("id,title,headline,body,image_url,target_url,cta_label,alt_text,placement,slot").eq("status","ACTIVE").eq("placement",surface).eq("slot",slot).lte("starts_at",now).gt("ends_at",now).order("created_at",{ascending:false}).limit(3);
 const ads=(data??[]).map((x:any)=>({id:x.id,title:x.headline||x.title,body:x.body,image_url:x.image_url,target_url:x.target_url,cta_label:x.cta_label||"Saber mais",alt_text:x.alt_text,placement:x.placement,slot:x.slot,source:"business"} as Ad));
 if(!ads.length)return null;
 const a=ads[0];
 return <aside className={"public-ad "+className} aria-label="Publicidade"><div className="public-ad-media">{a.image_url?<img src={a.image_url} alt={a.alt_text||a.title}/>:<span>PUBLICIDADE</span>}</div><div className="public-ad-copy"><small>Publicidade</small><h3>{a.title}</h3>{a.body&&<p>{a.body}</p>}{a.target_url&&<a href={a.target_url} className="btn primary">{a.cta_label||"Saber mais"} →</a>}</div></aside>;
}