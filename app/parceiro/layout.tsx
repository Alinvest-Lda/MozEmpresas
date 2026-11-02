import "./partner.css";
import { requirePartnerAccount } from "@/lib/auth/access";
import { PartnerShell } from "@/components/shells/partner-shell";
export default async function PartnerLayout({children}:{children:React.ReactNode}) {
  await requirePartnerAccount();
  return <PartnerShell>{children}</PartnerShell>;
}
