import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(5).max(5000),
});

export async function POST(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "public-contact", limit: 5, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

  try {
    const payload = schema.parse(await request.json());
    const sql = getPostgresClient();
    if (sql) {
      await sql.unsafe(
        "insert into public.contact_messages (name, email, phone, subject, message) values ($1, $2, $3, $4, $5)",
        [payload.name, payload.email, payload.phone || null, payload.subject, payload.message],
      );
    } else {
      const supabase = createAdminClient();
      if (!supabase) return rateLimitResponse(true);
      const { error } = await supabase.from("contact_messages").insert(payload);
      if (error) return NextResponse.json({ error: "Não foi possível enviar a mensagem." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verifique os dados preenchidos e tente novamente." }, { status: 400 });
  }
}
