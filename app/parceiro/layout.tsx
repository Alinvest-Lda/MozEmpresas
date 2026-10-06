import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PartnerSidebar } from "@/components/partner-sidebar";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.user_type !== "parceiro") redirect("/dashboard");

  return (
    <div className="dashboard-shell">
      <PartnerSidebar />
      {children}
    </div>
  );
}
