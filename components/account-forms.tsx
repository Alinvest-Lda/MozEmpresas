"use client";

import { useActionState } from "react";
import { updateAccountStatus, updatePassword, updateProfile } from "@/lib/account/actions";
import type { AccountState } from "@/lib/account/actions";

export function ProfileForm({ initial }: { initial: { fullName: string; location: string; website: string; bio: string } }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return <form action={action} className="account-form">
    <div className="account-form-grid">
      <label><span>Nome</span><input name="fullName" defaultValue={initial.fullName} required /></label>
      <label><span>Localização</span><input name="location" defaultValue={initial.location} placeholder="Maputo, Moçambique" /></label>
      <label><span>Website</span><input name="website" type="url" defaultValue={initial.website} placeholder="https://..." /></label>
    </div>
    <label><span>Apresentação</span><textarea name="bio" rows={4} defaultValue={initial.bio} placeholder="Uma breve apresentação sobre si." /></label>
    {state.error && <p className="notice">{state.error}</p>}{state.success && <p className="account-success">{state.success}</p>}
    <button className="btn primary" disabled={pending}>{pending ? "A guardar..." : "Guardar alterações"}</button>
  </form>;
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(updatePassword, {});
  return <form action={action} className="account-form">
    <div className="account-form-grid">
      <label><span>Nova password</span><input name="password" type="password" minLength={8} required /></label>
      <label><span>Confirmar password</span><input name="confirmPassword" type="password" minLength={8} required /></label>
    </div>
    {state.error && <p className="notice">{state.error}</p>}{state.success && <p className="account-success">{state.success}</p>}
    <button className="btn primary" disabled={pending}>{pending ? "A actualizar..." : "Alterar password"}</button>
  </form>;
}

export function AccountStatusForm({ status }: { status: "ACTIVE" | "INACTIVE" | "DELETED" }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateAccountStatus, {});
  return <form action={action} className="account-status-buttons">
    <button className="btn" type="submit" name="status" value="ACTIVE" disabled={pending || status === "DELETED"}>Activar</button>
    <button className="btn" type="submit" name="status" value="INACTIVE" disabled={pending || status === "DELETED"}>Desactivar</button>
    <button className="btn danger" type="submit" name="status" value="DELETED" disabled={pending || status === "DELETED"}>Eliminar conta</button>
    {state.error && <p className="notice">{state.error}</p>}{state.success && <p className="account-success">{state.success}</p>}
  </form>;
}
