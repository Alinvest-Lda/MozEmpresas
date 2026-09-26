import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  placement: z.enum(["DIRECTORY_BILLBOARD","DIRECTORY_FEATURED","DIRECTORY_SIDEBAR","DIRECTORY_INFEED"]),
  packageName: z.string().trim().min(2).max(120),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  message: z.string().trim().max(3000).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let businessId: string | null = null;
    if (user) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .ilike("name", payload.companyName)
        .limit(1)
        .maybeSingle();
      businessId = business?.id ?? null;
    }

    const { error } = await supabase.from("advertising_requests").insert({
      business_id: businessId,
      company_name: payload.companyName,
      contact_name: payload.contactName,
      email: payload.email,
      phone: payload.phone || null,
      placement: payload.placement,
      package_name: payload.packageName,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      message: payload.message || null,
    });

    if (error) return NextResponse.json({ error: "Não foi possível registar o pedido." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verifique os dados preenchidos." }, { status: 400 });
  }
}