export const dynamic="force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerAccessBootstrap() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/parceiro-acesso");
  if (user.email?.toLowerCase() !== "al.andrelanga@outlook.com") redirect("/dashboard");
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, full_name: user.user_metadata?.full_name || user.email.split("@")[0], user_type: "parceiro" },
    { onConflict: "id" }
  );
  if (error) redirect("/dashboard");
  redirect("/parceiro");
}