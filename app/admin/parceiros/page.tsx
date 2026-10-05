import Link from "next/link";
import { createPartnerAccess, requireSuperAdmin } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

export default async function PartnerAccessAdmin({ searchParams }: { searchParams: Promise<{ created?: string; access?: string; error?: string }> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-welcome">
            <span className="dashboard-kicker">Administração da plataforma</span>
            <h1>Acessos de parceiros</h1>
            <p>Crie acessos dedicados para parceiros. O parceiro não escolhe esse tipo de conta no registo público.</p>
          </div>
        </header>
        {params.created === "1" && params.access && (
          <section className="dashboard-section">
            <span className="dashboard-kicker">Acesso criado</span>
            <h2>Envie este link ao parceiro</h2>
            <p className="muted">O link é apresentado apenas nesta operação. Guarde-o ou copie-o antes de sair desta página.</p>
            <div className="notice" style={{ wordBreak: "break-all" }}>{params.access}</div>
          </section>
        )}
        {params.error && (
          <section className="dashboard-section">
            <div className="notice">
              {params.error === "forbidden" ? "Apenas o Super Admin pode criar acessos de parceiros." : "Não foi possível criar o acesso. Verifique os dados e tente novamente."}
            </div>
          </section>
        )}
        <section className="dashboard-section">
          <span className="dashboard-kicker">Novo acesso</span>
          <h2>Criar acesso dedicado</h2>
          <form action={createPartnerAccess} style={{ maxWidth: 620, marginTop: 24 }}>
            <div className="field">
              <label htmlFor="email">Email do parceiro</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="expiresInDays">Validade</label>
              <select id="expiresInDays" name="expiresInDays" defaultValue="7">
                <option value="1">1 dia</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </div>
            <button className="btn primary">Criar acesso de parceiro</button>
          </form>
        </section>
        <p style={{ marginTop: 20 }}><Link href="/dashboard">Voltar ao dashboard</Link></p>
      </div>
    </main>
  );
}
