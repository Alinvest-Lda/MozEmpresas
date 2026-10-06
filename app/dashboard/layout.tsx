import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.user_type === "parceiro") {
      redirect("/parceiro");
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />
      {children}
    </div>
  );
}
