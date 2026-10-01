import "./dashboard-ux.css";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell">
      <DashboardSidebar />
      {children}
    </div>
  );
}
