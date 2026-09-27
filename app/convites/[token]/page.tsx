export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptBusinessInvitation } from "@/lib/businesses/accept-invitation";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/convites/" + token);

  return <div className="auth"><div className="auth-card">
    <span className="eyebrow">Convite de equipa</span>
    <h2>Acesso a uma empresa</h2>
    <p className="muted">Este convite foi enviado para o email associado à sua conta. Ao aceitar, passará a poder trabalhar no espaço empresarial conforme a função atribuída.</p>
    <form action={acceptBusinessInvitation}>
      <input type="hidden" name="token" value={token} />
      <button className="btn primary full">Aceitar convite</button>
    </form>
    <Link href="/dashboard" className="text-link" style={{display:"block",marginTop:14}}>Voltar ao painel</Link>
  </div></div>;
}
