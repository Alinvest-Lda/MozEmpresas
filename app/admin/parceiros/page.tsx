import { redirect } from "next/navigation";

export default function LegacyPartnerAccessRoute() {
  redirect("/dashboard/admin/parceiros");
}
