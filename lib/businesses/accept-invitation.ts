"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptBusinessInvitation(formData: FormData) {
  const token = String(formData.get("token") || "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/dashboard/acessos?invite=invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invitation } = await supabase
    .from("business_invitations")
    .select("id,business_id,role,email,expires_at")
    .eq("token_hash", tokenHash)
    .eq("email", user.email.toLowerCase())
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!invitation) redirect("/dashboard/acessos?invite=invalid");

  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: invitation.business_id, user_id: user.id, role: invitation.role,
  });
  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    redirect("/dashboard/acessos?invite=error");
  }

  await supabase.from("business_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/acessos");
  redirect("/dashboard/acessos?invite=accepted");
}
