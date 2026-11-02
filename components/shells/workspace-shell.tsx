import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
export function WorkspaceShell({children}:{children:ReactNode}) {
  return <div className="dashboard-shell"><DashboardSidebar/>{children}</div>;
}
