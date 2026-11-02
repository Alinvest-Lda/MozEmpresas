import { requireNormalAccount } from "@/lib/auth/access";
import { WorkspaceShell } from "@/components/shells/workspace-shell";
export default async function DashboardLayout({children}:{children:React.ReactNode}) {
  await requireNormalAccount();
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
