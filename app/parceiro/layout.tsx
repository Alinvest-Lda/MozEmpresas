import "./partner.css";
import { requirePartnerAccount } from "@/lib/auth/access";
import { PartnerSidebar } from "@/components/partner-sidebar";
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requirePartnerAccount();
  return <div className="partner-shell"><PartnerSidebar />{children}</div>;
}