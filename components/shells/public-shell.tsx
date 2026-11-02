import type { ReactNode } from "react";
import type { AccountType } from "@/lib/auth/access";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
export function PublicShell({children,initialSignedIn,initialAccountType}:{children:ReactNode;initialSignedIn:boolean;initialAccountType:AccountType|null}) {
  return <><Header initialSignedIn={initialSignedIn} initialAccountType={initialAccountType}/>{children}<Footer/></>;
}
