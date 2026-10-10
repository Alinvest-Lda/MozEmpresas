"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Legacy entry point retained to avoid breaking any stale form imports.
 * Contest creation is no longer a self-service final-user feature; requests
 * must go through the paid MozEmpresas service.
 */
export async function createContest(_formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    redirect("/login?next=%2Fdashboard%2Fservicos%2Fconcursos-empresariais");
  }
  redirect("/dashboard/servicos/concursos-empresariais");
}
