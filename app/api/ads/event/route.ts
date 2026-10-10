import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema=z.object({
 visitorKey:z.string().min(16).max(120),
 campaignSource:z.enum(["business","partner"]),
 campaignId:z.string().uuid(),
 surface:z.enum(["HOME","DIRECTORY","MARKETPLACE","OPPORTUNITIES"]),
 slot:z.enum(["HERO","BILLBOARD","EXCLUSIVE","FEATURED","INFEED","CONTEXT"]),
 eventType:z.enum(["IMPRESSION","CLICK"]),
 context:z.record(z.string(),z.string()).optional(),
});

export async function POST(request:Request){
 try{
  const payload=schema.parse(await request.json());
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ad_delivery_events").insert({
   visitor_key:payload.visitorKey,user_id:user?.id??null,campaign_source:payload.campaignSource,
   campaign_id:payload.campaignId,surface:payload.surface,slot:payload.slot,event_type:payload.eventType,
   context:payload.context||{}
  });
  if(error) return NextResponse.json({error:"Não foi possível registar o evento."},{status:500});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Evento de publicidade inválido."},{status:400});}
}
