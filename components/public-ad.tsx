"use client";

import { useEffect, useState } from "react";

type Ad={campaign_source:"business"|"partner";campaign_id:string;title:string;headline:string|null;body:string|null;image_url:string|null;target_url:string|null;cta_label:string|null;alt_text:string|null;creative_type:string;score:number};
type Props={surface:"HOME"|"DIRECTORY"|"MARKETPLACE"|"OPPORTUNITIES";slot?:"HERO"|"BILLBOARD"|"FEATURED"|"INFEED"|"CONTEXT";className?:string;context?:Record<string,string>;interests?:string[]};

function visitorKey(){
 if(typeof window==="undefined") return "";
 try {
  const key=window.localStorage.getItem("mozempresas_ad_visitor");
  if(key) return key;
  const value=(typeof crypto!=="undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "visitor")+"-"+Math.random().toString(36).slice(2);
  window.localStorage.setItem("mozempresas_ad_visitor",value);
  return value;
 } catch {
  // Privacy settings may block storage. Keep ads optional instead of breaking the page.
  return "";
 }
}

export function PublicAd({surface,slot="BILLBOARD",className="",context={},interests=[]}:Props){
 const[ad,setAd]=useState<Ad|null>(null);
 useEffect(()=>{
  const key=visitorKey(); if(!key)return;
  fetch("/api/ads/decision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorKey:key,surface,slot,context,interests})})
   .then(r=>r.ok?r.json():null).then(v=>{if(v?.ad)setAd(v.ad)}).catch(()=>{});
 },[surface,slot,JSON.stringify(context),JSON.stringify(interests)]);
 if(!ad)return null;
 const click=()=>{
  const key=visitorKey();
  void fetch("/api/ads/event",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorKey:key,campaignSource:ad.campaign_source,campaignId:ad.campaign_id,surface,slot,eventType:"CLICK",context})}).catch(()=>{});
 };
 return <aside className={"public-ad "+className} aria-label="Publicidade">
  <div className="public-ad-media">{ad.image_url?<img src={ad.image_url} alt={ad.alt_text||ad.headline||ad.title}/>:<span>PUBLICIDADE</span>}</div>
  <div className="public-ad-copy"><small>Publicidade</small><h3>{ad.headline||ad.title}</h3>{ad.body&&<p>{ad.body}</p>}{ad.target_url&&<a href={ad.target_url} onClick={click} className="btn primary">{ad.cta_label||"Saber mais"} →</a>}</div>
 </aside>;
}
