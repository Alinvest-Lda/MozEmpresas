import type { ReactNode } from "react";
import { PartnerSidebar } from "@/components/partner-sidebar";
export function PartnerShell({children}:{children:ReactNode}) {
  return <div className="partner-shell"><PartnerSidebar/>{children}</div>;
}
