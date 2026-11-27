import { NextResponse } from "next/server";
import { withApiObservability } from "@/lib/observability/api";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isValidAdSurfaceSlot } from "@/lib/advertising/placements";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";

const schema=z.object({
 visitorKey:z.string().min(16).max(120),
 surface:z.enum(["HOME","DIRECTORY","MARKETPLACE","OPPORTUNITIES"]),
 slot:z.enum(["HERO","BILLBOARD","EXCLUSIVE","FEATURED","INFEED","CONTEXT"]),
 context:z.record(z.string().max(80),z.string().max(160)).refine(v=>Object.keys(v).length<=20).optional(),
 interests:z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});

export const POST = withApiObservability("api.ads_decision", async (request: Request) => {
 const rate = await enforceRateLimit(request, { scope: "ads-decision", limit: 30, windowSeconds: 60 });
 if (!rate.allowed) return rateLimitResponse(rate.unavailable);

 const bodyLimit=16_384;
 const declaredLength=Number(request.headers.get("content-length")||0);
 if(declaredLength>bodyLimit) return NextResponse.json({error:"Pedido de publicidade demasiado grande."},{status:413});
 const reader=request.body?.getReader();
 let chunks:Uint8Array[]=[];
 let totalBytes=0;
 if(reader){
   while(true){
     const {done,value}=await reader.read();
     if(done) break;
     totalBytes+=value.byteLength;
     if(totalBytes>bodyLimit){await reader.cancel().catch(()=>{});return NextResponse.json({error:"Pedido de publicidade demasiado grande."},{status:413});}
     chunks.push(value);
   }
 }
 const bytes=new Uint8Array(totalBytes);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let body:unknown=null;
 try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{}
 const parsed = schema.safeParse(body);
 if (!parsed.success) return NextResponse.json({error:"Pedido de publicidade inválido."},{status:400});

 try{
  const payload=parsed.data;
  if(!isValidAdSurfaceSlot(payload.surface,payload.slot)) return NextResponse.json({error:"A posição publicitária não existe nesta superfície."},{status:400});
  const supabase=await createClient();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError) return NextResponse.json({error:"Não foi possível validar a sessão."},{status:500});
  const context=payload.context||{};
  const interests=(payload.interests||[]).map(v=>v.trim().toLowerCase()).filter(Boolean);
  const {error:interestError}=await supabase.rpc("record_ad_interest",{p_visitor_key:payload.visitorKey,p_user_id:user?.id??null,p_interests:interests,p_context:context});
  if(interestError) return NextResponse.json({error:"Não foi possível registar as preferências de publicidade."},{status:500});
  const {data,error}=await supabase.rpc("get_ad_decision",{p_visitor_key:payload.visitorKey,p_user_id:user?.id??null,p_surface:payload.surface,p_slot:payload.slot,p_context:context});
  if(error) return NextResponse.json({error:"Não foi possível seleccionar a publicidade."},{status:500});
  const ad=data?.[0]??null;
  if(ad){
    const sql = getPostgresClient();
    if (sql) {
      const rows=await sql.unsafe(
        "select public.record_ad_delivery_event_f370($1,$2,$3,$4,$5,$6,'IMPRESSION',$7::jsonb) as recorded",
        [payload.visitorKey, user?.id ?? null, ad.campaign_source, ad.campaign_id, payload.surface, payload.slot, JSON.stringify(context)],
      ) as {recorded:boolean}[];
      if(!rows.length || typeof rows[0]?.recorded!=="boolean") return NextResponse.json({error:"Não foi possível confirmar o registo da impressão."},{status:500});
    } else {
      const admin = createAdminClient();
      if (!admin) return rateLimitResponse(true);
      const {error:impressionError}=await admin.rpc("record_ad_delivery_event_f370",{
        p_visitor_key:payload.visitorKey,p_user_id:user?.id??null,
        p_campaign_source:ad.campaign_source,p_campaign_id:ad.campaign_id,
        p_surface:payload.surface,p_slot:payload.slot,p_event_type:"IMPRESSION",p_context:context
      });
      if(impressionError) {
        if(impressionError.message.includes("AD_CAMPAIGN_NOT_ELIGIBLE")) return NextResponse.json({error:"A campanha deixou de estar activa para este espaço e período."},{status:409});
        return NextResponse.json({error:"Não foi possível registar a impressão publicitária."},{status:500});
      }
    }
  }
  return NextResponse.json({ad});
 }catch(error){
  if(error instanceof Error && error.message.includes("AD_CAMPAIGN_NOT_ELIGIBLE")) {
    return NextResponse.json({error:"A campanha deixou de estar activa para este espaço e período."},{status:409});
  }
  return NextResponse.json({error:"Não foi possível seleccionar a publicidade."},{status:500});
 }
});
