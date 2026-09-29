import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ContestsRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/dashboard/servicos/concursos-empresariais" : "/login?next=/dashboard/servicos/concursos-empresariais");
}
