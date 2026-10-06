"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "btn header-signout full" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button className={className} type="button" onClick={handleSignOut} disabled={pending}>
      {pending ? "A sair..." : "Sair"}
    </button>
  );
}
