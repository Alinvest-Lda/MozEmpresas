"use client";

import { useActionState } from "react";
import { inviteBusinessMember } from "@/lib/businesses/invitation-actions";

type Business = { id: string; name: string; slug: string | null };
type InviteState = { error?: string; success?: boolean; invitePath?: string };

export function InviteForm({ businesses }: { businesses: Business[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteBusinessMember, {});
  return <>
    <form action={action} className="access-invite-form">
      <label><span>Empresa</span><select name="businessId" required>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
      <label><span>Email</span><input name="email" type="email" placeholder="email@empresa.co.mz" required /></label>
      <label><span>Função</span><select name="role" defaultValue="operator"><option value="admin">Administrador</option><option value="operator">Operador</option><option value="member">Membro</option><option value="viewer">Consulta</option></select></label>
      <button className="btn primary" type="submit" disabled={pending}>{pending ? "A criar..." : "Criar convite"}</button>
    </form>
    {state.error && <p className="notice">{state.error}</p>}
    {state.success && state.invitePath && <div className="account-success"><strong>Convite criado.</strong><p>Envie este link à pessoa convidada:</p><code>{state.invitePath}</code></div>}
  </>;
}
