import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema=z.object({
 visitorKey:z.string().min(16).max(120),
 surface:z.enum(["HOME","DIRECTORY","MARKETPLACE","OPPORTUNITIES"]),
 slot:z.enum(["HERO","BILLBOARD","FEATURED","INFEED","CONTEXT"]),
 context:z.record(z.string(),z.string()).optional(),
 interests:z.array(z.string()).max(20).optional(),
});

export async function POST(request:Request){
 try{
  const payload=schema.parse(await request.json());
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const context=payload.context||{};
  const interests=(payload.interests||[]).map(v=>v.trim().toLowerCase()).filter(Boolean);
  await supabase.rpc("record_ad_interest",{p_visitor_key:payload.visitorKey,p_user_id:user?.id??null,p_interests:interests,p_context:context});
  const {data,error}=await supabase.rpc("get_ad_decision",{p_visitor_key:payload.visitorKey,p_user_id:user?.id??null,p_surface:payload.surface,p_slot:payload.slot,p_context:context});
  if(error) return NextResponse.json({error:"Não foi possível seleccionar a publicidade."},{status:500});
  const ad=data?.[0]??null;
  if(ad){
    await supabase.from("ad_delivery_events").insert({
      visitor_key:payload.visitorKey,user_id:user?.id??null,campaign_source:ad.campaign_source,
      campaign_id:ad.campaign_id,surface:payload.surface,slot:payload.slot,event_type:"IMPRESSION",context
    });
  }
  return NextResponse.json({ad});
 }catch{return NextResponse.json({error:"Pedido de publicidade inválido."},{status:400});}
}
