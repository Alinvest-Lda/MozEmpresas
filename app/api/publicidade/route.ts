import { NextResponse } from "next/server";
import { withApiObservability } from "@/lib/observability/api";
import { z } from "zod";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isValidAdSurfaceSlot } from "@/lib/advertising/placements";

const schema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  surface: z.enum(["HOME","DIRECTORY","MARKETPLACE","OPPORTUNITIES"]),
  slot: z.enum(["HERO","BILLBOARD","FEATURED","INFEED","EXCLUSIVE","CONTEXT"]),
  creativeType: z.enum(["BANNER","NATIVE","CARD","TEXT"]),
  packageName: z.string().trim().min(2).max(120),
  startsAt: z.string().max(40).optional(),
  endsAt: z.string().max(40).optional(),
  headline: z.string().trim().max(160).optional(),
  body: z.string().trim().max(3000).optional(),
  imageUrl: z.string().trim().url().max(1000).refine(value=>value.startsWith("https://"),{message:"A imagem deve usar HTTPS."}).optional().or(z.literal("")),
  targetUrl: z.string().trim().url().max(1000).refine(value=>value.startsWith("https://"),{message:"O destino deve usar HTTPS."}).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional(),
  altText: z.string().trim().max(180).optional(),
  message: z.string().trim().max(3000).optional(),
  audienceMode: z.enum(["CONTEXTUAL","INTEREST","BROAD"]).default("CONTEXTUAL"),
  budget: z.preprocess(value=>value===""||value===null?undefined:value,z.coerce.number().nonnegative().max(1_000_000_000_000).optional()),
  bidCpm: z.preprocess(value=>value===""||value===null?undefined:value,z.coerce.number().nonnegative().max(1_000_000_000_000).optional()),
  frequencyCap: z.coerce.number().int().min(1).max(20).default(2),
  targetInterests: z.string().trim().max(1000).optional(),
  targetLocations: z.string().trim().max(500).optional(),
}).superRefine((payload,ctx)=>{
  if(!isValidAdSurfaceSlot(payload.surface,payload.slot)){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"A posição não está disponível no espaço seleccionado.",path:["slot"]});
  }
  const parseCampaignDate=(value:string|undefined,isEnd=false):number|null=>{
    if(!value)return null;
    const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?value+(isEnd?"T23:59:59.999+02:00":"T00:00:00+02:00") :/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)?value:value+"+02:00";
    const timestamp=Date.parse(normalized);
    return Number.isFinite(timestamp)?timestamp:null;
  };
  const start= parseCampaignDate(payload.startsAt);
  const end=parseCampaignDate(payload.endsAt,true);
  if(payload.startsAt && start===null){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"Data inválida.",path:["startsAt"]});
  }
  if(payload.endsAt && end===null){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"Data inválida.",path:["endsAt"]});
  }
  if(start!==null&&end!==null&&end<=start){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"O período da campanha é inválido.",path:["endsAt"]});
  }
  const maputoToday=new Date(Date.now()+2*60*60*1000).toISOString().slice(0,10);
  const maputoDate=(timestamp:number)=>new Date(timestamp+2*60*60*1000).toISOString().slice(0,10);
  if(start!==null&&maputoDate(start)<maputoToday){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"A data de início não pode estar no passado.",path:["startsAt"]});
  }
  if(end!==null&&maputoDate(end)<maputoToday){
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"A data de fim não pode estar no passado.",path:["endsAt"]});
  }
});

export const POST = withApiObservability("api.advertising_request", async (request: Request) => {
  const rate = await enforceRateLimit(request, { scope: "public-advertising-request", limit: 5, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

  const bodyLimit=16_384;
  const declaredLength=Number(request.headers.get("content-length")||0);
  if(declaredLength>bodyLimit) return NextResponse.json({error:"Pedido demasiado grande."},{status:413});
  const reader=request.body?.getReader();
  let chunks:Uint8Array[]=[];
  let totalBytes=0;
  if(reader){
    while(true){
      const {done,value}=await reader.read();
      if(done) break;
      totalBytes+=value.byteLength;
      if(totalBytes>bodyLimit){await reader.cancel().catch(()=>{});return NextResponse.json({error:"Pedido demasiado grande."},{status:413});}
      chunks.push(value);
    }
  }
  const bytes=new Uint8Array(totalBytes);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let body:unknown=null;
  try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{}
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Verifique os dados preenchidos." }, { status: 400 });

  try {
    const payload = parsed.data;
    const toMaputoIso=(value:string|undefined,isEnd=false)=>{
      if(!value)return null;
      const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?value+(isEnd?"T23:59:59.999+02:00":"T00:00:00+02:00"):/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)?value:value+"+02:00";
      const date=new Date(normalized);
      return Number.isFinite(date.getTime())?date.toISOString():null;
    };
    const startsAt=toMaputoIso(payload.startsAt);
    const endsAt=toMaputoIso(payload.endsAt,true);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let businessId: string | null = null;
    if (user) {
      const [{data:ownedBusinesses,error:ownedError},{data:businessMemberships,error:membershipError}]=await Promise.all([
        supabase.from("businesses").select("id").eq("owner_id",user.id).ilike("name",payload.companyName).is("archived_at",null).limit(2),
        supabase.from("business_members").select("business_id").eq("user_id",user.id).in("role",["owner","admin","operator"]),
      ]);
      if(!ownedError&&!membershipError){
        const candidateIds=[...new Set([...(ownedBusinesses??[]).map(b=>b.id),...(businessMemberships??[]).map(m=>m.business_id)])];
        if(candidateIds.length){
          const {data:matches,error:matchError}=await supabase.from("businesses").select("id").in("id",candidateIds).ilike("name",payload.companyName).is("archived_at",null).limit(2);
          if(!matchError&&matches?.length===1) businessId=matches[0].id;
        }
      }
    }

    const normalizeAudienceList=(raw:string|undefined,maxItems=20)=>{const items=[...new Set((raw||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean))];return items.length<=maxItems&&items.every(v=>v.length<=120)?items:null;};
    const targetInterests=normalizeAudienceList(payload.targetInterests);
    const targetLocations=normalizeAudienceList(payload.targetLocations);
    if(targetInterests===null||targetLocations===null) return NextResponse.json({error:"Limite de segmentação excedido. Use até 20 critérios por campo."},{status:400});
    const values = [
      businessId, payload.companyName, payload.contactName, payload.email, payload.phone || null,
      payload.surface, payload.slot, payload.creativeType, payload.packageName, payload.headline || null,
      payload.body || null, payload.imageUrl || null, payload.targetUrl || null, payload.ctaLabel || null,
      payload.altText || null, startsAt, endsAt, payload.message || null,
      payload.audienceMode, payload.budget ?? null, payload.bidCpm ?? null, payload.frequencyCap,
      targetInterests,
      targetLocations,
    ];
    const sql = getPostgresClient();
    if (sql) {
      await sql.unsafe(
        `insert into public.advertising_requests (
          business_id, company_name, contact_name, email, phone, surface, slot, creative_type, package_name,
          headline, body, image_url, target_url, cta_label, alt_text, starts_at, ends_at, message, audience_mode,
          budget, bid_cpm, frequency_cap, target_interests, target_locations
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::timestamptz,
          $17::timestamptz, $18, $19, $20, $21, $22, $23::text[], $24::text[]
        )`,
        values,
      );
    } else {
      const admin = createAdminClient();
      if (!admin) return rateLimitResponse(true);
      const { error } = await admin.from("advertising_requests").insert({
        business_id: businessId,
        company_name: payload.companyName,
        contact_name: payload.contactName,
        email: payload.email,
        phone: payload.phone || null,
        surface: payload.surface,
        slot: payload.slot,
        creative_type: payload.creativeType,
        package_name: payload.packageName,
        headline: payload.headline || null,
        body: payload.body || null,
        image_url: payload.imageUrl || null,
        target_url: payload.targetUrl || null,
        cta_label: payload.ctaLabel || null,
        alt_text: payload.altText || null,
        starts_at: payload.startsAt || null,
        ends_at: payload.endsAt || null,
        message: payload.message || null,
        audience_mode: payload.audienceMode,
        budget: payload.budget ?? null,
        bid_cpm: payload.bidCpm ?? null,
        frequency_cap: payload.frequencyCap,
        target_interests: targetInterests,
        target_locations: targetLocations,
      });
      if (error) return NextResponse.json({ error: "Não foi possível registar o pedido." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registar o pedido." }, { status: 500 });
  }
});
