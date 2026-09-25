import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(5).max(5000),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const supabase = await createClient();
    const { error } = await supabase.from("contact_messages").insert(payload);
    if (error) return NextResponse.json({ error: "Não foi possível enviar a mensagem." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verifique os dados preenchidos e tente novamente." }, { status: 400 });
  }
}
