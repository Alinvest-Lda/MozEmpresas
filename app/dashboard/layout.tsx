import { requireNormalAccount } from "@/lib/auth/access";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireNormalAccount();

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />
      {children}
    </div>
  );
}
