import type { ReactNode } from "react";
import { requireSuperAdmin } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin("/dashboard/admin");
  return children;
}
