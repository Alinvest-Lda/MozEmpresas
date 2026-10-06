import Link from "next/link";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { PartnerActivationForm } from "@/components/partner-activation-form";

export const dynamic = "force-dynamic";

export default async function PartnerActivation({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params.token || "";
  const supabase = await createClient();
  const { data } = token
    ? await supabase.rpc("partner_access_validate", {
        p_token_hash: createHash("sha256").update(token).digest("hex"),
      })
    : { data: [] };

  const valid = Array.isArray(data) && !!data[0]?.email;

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link href="/" className="auth-logo">Moz<span>Empresas</span></Link>
          <h1>Acesso dedicado ao ecossistema de parceiros.</h1>
          <p>Este acesso é criado pelo Super Admin do MozEmpresas. Não é um registo público de parceiro.</p>
          <div className="auth-points">
            <span>01 <b>Acesso atribuído</b></span>
            <span>02 <b>Conta activada</b></span>
            <span>03 <b>Workspace de parceiro</b></span>
          </div>
        </aside>
        <section className="auth-card">
          <span className="eyebrow">Acesso dedicado</span>
          <h2>{valid ? "Activar conta de parceiro" : "Acesso inválido"}</h2>
          {valid ? (
            <>
              <p className="muted">Email autorizado: <strong>{data[0].email}</strong></p>
              <PartnerActivationForm token={token} />
            </>
          ) : (
            <p className="notice">O link não é válido, já foi utilizado ou expirou. Solicite um novo acesso ao Super Admin.</p>
          )}
        </section>
      </div>
    </main>
  );
}