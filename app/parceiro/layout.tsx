import { requirePartnerAccount } from "@/lib/auth/access";
import { PartnerSidebar } from "@/components/partner-sidebar";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requirePartnerAccount();

  return (
    <div className="dashboard-shell">
      <PartnerSidebar />
      {children}
    </div>
  );
}
