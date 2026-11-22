import { getSuperAdminContext } from "@/lib/auth/super-admin";
import {
  createInstitutionalPartner, createPartnerContract, createPartnerEngagement,
  issuePartnerInvoice, recordPartnerBankTransfer, verifyPartnerBankTransfer,
  createPartnerContact, createPartnerReportDelivery,
} from "@/lib/admin/partner-institutional-actions";
import styles from "./gestao.module.css";

export const dynamic = "force-dynamic";

const money = (n: number | string | null) => n == null ? "—" : `${Number(n).toLocaleString("pt-MZ",{maximumFractionDigits:2})} MZN`;
const date = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-MZ",{timeZone:"Africa/Maputo"}) : "—";
const messages: Record<string,string> = {
  contact:"Indique nome e pelo menos um meio de contacto.", "contact-save":"Não foi possível registar o contacto.",
  report:"Revise o relatório, destinatários e ficheiro/link de entrega.", "report-save":"Não foi possível registar a entrega do relatório.",
  partner:"Revise os dados da entidade parceira.", "partner-save":"Não foi possível criar a entidade. Verifique os dados e permissões.",
  contract:"Revise os dados do contrato.", "contract-save":"Não foi possível registar o contrato. Verifique o código e a entidade.",
  engagement:"Revise os dados do serviço.", "engagement-save":"Não foi possível criar a ordem de execução.",
  invoice:"Revise os dados da factura.", "invoice-save":"Não foi possível emitir o documento.",
  transfer:"Revise os dados da transferência.", "transfer-save":"Não foi possível registar o pagamento.",
  verify:"Não foi possível confirmar o pagamento.", "payment-id":"Identificador de pagamento inválido.",
};
const saved: Record<string,string> = {contact:"Contacto registado.",report:"Relatório registado.",partner:"Entidade parceira criada.",contract:"Contrato registado.",engagement:"Ordem de execução criada.",invoice:"Factura emitida.",transfer:"Transferência registada para verificação.",verified:"Transferência confirmada."};

export default async function InstitutionalPartnersPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
  const {supabase,authorized}=await getSuperAdminContext();
  if(!authorized) return null;
  const params=await searchParams;
  const [{data:partners,error:partnerError},{data:contracts},{data:engagements},{data:payments},{data:documents}] = await Promise.all([
    supabase.from("partner_accounts").select("id,name,legal_name,operating_model,portal_enabled,status,contact_email,contact_phone,created_at").order("created_at",{ascending:false}).limit(250),
    supabase.from("partner_contracts").select("id,account_id,contract_code,title,contract_type,status,contracted_amount_mzn,billing_frequency,starts_on,ends_on").order("created_at",{ascending:false}).limit(150),
    supabase.from("partner_service_engagements").select("id,account_id,contract_id,title,service_type,status,request_source,agreed_amount_mzn,due_at,received_at").order("received_at",{ascending:false}).limit(150),
    supabase.from("financial_payments").select("id,partner_account_id,contract_id,document_id,amount_mzn,status,method,reference,bank_name,payer_name,transfer_date,created_at").not("partner_account_id","is",null).order("created_at",{ascending:false}).limit(150),
    supabase.from("financial_documents").select("id,partner_account_id,contract_id,engagement_id,document_number,document_type,status,amount_mzn,issued_at,due_at").not("partner_account_id","is",null).order("issued_at",{ascending:false}).limit(150),
  ]);
  const p=partners??[], c=contracts??[], e=engagements??[], pay=payments??[], docs=documents??[];
  const partnerName=(id:string)=>p.find(x=>x.id===id)?.name??"Parceiro";
  return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>Backoffice institucional · F3.26</span><h1>Gestão de parceiros</h1><p>Registe entidades, contratos, pedidos recebidos fora do portal, execução interna, facturação e pagamentos por transferência. O acesso do parceiro ao sistema é opcional.</p></div><a href="/dashboard/admin/parceiros">Gerir convites e acessos <span>→</span></a></header>
    {params.error?<div className={styles.error} role="alert">{messages[params.error]??"Não foi possível concluir a operação."}</div>:null}
    {params.saved?<div className={styles.success} role="status">{saved[params.saved]??"Operação registada."}</div>:null}
    <section className={styles.metrics}><article><span>Entidades parceiras</span><strong>{p.length}</strong><small>Independentes de empresas e utilizadores</small></article><article><span>Contratos</span><strong>{c.length}</strong><small>Registados no backoffice</small></article><article><span>Execuções</span><strong>{e.length}</strong><small>Pedidos e serviços em acompanhamento</small></article><article><span>Pagamentos pendentes</span><strong>{pay.filter(x=>x.status==="PENDING").length}</strong><small>Inclui transferências por verificar</small></article></section>
    <section className={styles.grid}>
      <article className={styles.panel}><h2>Nova entidade parceira</h2><p>Não é necessário associar uma empresa, criar utilizador ou activar portal.</p><form action={createInstitutionalPartner} className={styles.form}>
        <label>Nome da organização<input name="name" required minLength={2} maxLength={180} placeholder="Nome institucional"/></label>
        <label>Denominação legal<input name="legal_name" maxLength={180}/></label><label>NUIT<input name="tax_id" maxLength={80}/></label>
        <div className={styles.two}><label>Email de contacto<input name="contact_email" type="email"/></label><label>Telefone<input name="contact_phone" maxLength={60}/></label></div>
        <label>Modelo operacional<select name="operating_model" defaultValue="MANAGED"><option value="MANAGED">Gestão integral pela MozEmpresas</option><option value="STRATEGIC">Parceiro estratégico / institucional</option><option value="HYBRID">Híbrido (backoffice + portal)</option><option value="SELF_SERVICE">Auto-serviço</option></select></label>
        <label>Acesso ao portal<select name="portal_enabled" defaultValue="false"><option value="false">Não — sem acesso</option><option value="true">Sim — acesso opcional</option></select></label>
        <label>Descrição / notas internas<textarea name="description" rows={2} maxLength={2000}/></label><button type="submit">Criar entidade</button>
      </form></article>
      <article className={styles.panel}><h2>Novo contrato</h2><p>Formalize o relacionamento e as condições comerciais.</p><form action={createPartnerContract} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className={styles.two}><label>Código do contrato<input name="contract_code" required placeholder="Ex.: PAR-2026-001"/></label><label>Valor contratado (MZN)<input name="contracted_amount_mzn" type="number" min="0" step=".01" defaultValue="0" required/></label></div>
        <label>Objecto / título<input name="title" required maxLength={180}/></label>
        <div className={styles.two}><label>Tipo<select name="contract_type"><option value="STRATEGIC_PARTNERSHIP">Parceria estratégica</option><option value="CAMPAIGN_PACKAGE">Pacote de campanhas</option><option value="SERVICE_ORDER">Prestação de serviços</option><option value="REPORTING">Reporting / inteligência</option><option value="RETAINER"> avença / avença mensal</option><option value="OTHER">Outro</option></select></label><label>Facturação<select name="billing_frequency"><option value="ONE_OFF">Única</option><option value="MONTHLY">Mensal</option><option value="QUARTERLY">Trimestral</option><option value="SEMI_ANNUAL">Semestral</option><option value="ANNUAL">Anual</option><option value="MILESTONE">Por marco</option></select></label></div>
        <div className={styles.two}><label>Início<input name="starts_on" type="date"/></label><label>Fim<input name="ends_on" type="date"/></label></div>
        <label>Condições de pagamento<textarea name="payment_terms" rows={2}/></label><button type="submit" disabled={!p.length}>Registar contrato</button>
      </form></article>
      <article className={styles.panel}><h2>Pedido / execução interna</h2><p>Registe solicitações recebidas por email, reunião, telefone ou contrato.</p><form action={createPartnerEngagement} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Contrato (opcional)<select name="contract_id" defaultValue=""><option value="">Sem contrato associado</option>{c.map(x=><option key={x.id} value={x.id}>{x.contract_code} · {x.title}</option>)}</select></label>
        <label>Serviço<select name="service_type"><option value="ADVERTISING">Publicidade</option><option value="CAMPAIGN_MANAGEMENT">Gestão de campanhas</option><option value="MARKET_INTELLIGENCE">Inteligência de mercado</option><option value="REPORTING">Relatórios</option><option value="LEAD_GENERATION">Geração de oportunidades</option><option value="PROMOTION">Promoção</option><option value="STRATEGIC_PARTNERSHIP">Parceria estratégica</option><option value="OTHER">Outro</option></select></label>
        <div className={styles.two}><label>Origem<select name="request_source"><option value="EMAIL">Email</option><option value="MEETING">Reunião</option><option value="CONTRACT">Contrato</option><option value="PHONE">Telefone</option><option value="BACKOFFICE">Registo interno</option><option value="OTHER">Outro</option></select></label><label>Valor acordado (MZN)<input name="agreed_amount_mzn" type="number" min="0" step=".01"/></label></div>
        <label>Título<input name="title" required maxLength={180}/></label><label>Descrição<textarea name="description" rows={2}/></label><label>Prazo<input name="due_at" type="datetime-local"/></label><button type="submit" disabled={!p.length}>Criar ordem de execução</button>
      </form></article>
      <article className={styles.panel}><h2>Emitir factura</h2><p>O documento fica associado à entidade contratante, mesmo sem utilizador externo.</p><form action={issuePartnerInvoice} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Contrato<select name="contract_id" defaultValue=""><option value="">Sem contrato</option>{c.map(x=><option key={x.id} value={x.id}>{x.contract_code} · {x.title}</option>)}</select></label>
        <div className={styles.two}><label>N.º documento<input name="document_number" required/></label><label>Valor (MZN)<input name="amount_mzn" type="number" min=".01" step=".01" required/></label></div><button type="submit" disabled={!p.length}>Emitir factura</button>
      </form></article>
      <article className={styles.panel}><h2>Registar transferência bancária</h2><p>O registo inicia-se como pendente. Só passa a confirmado após validação financeira.</p><form action={recordPartnerBankTransfer} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Contrato<select name="contract_id" defaultValue=""><option value="">Sem contrato</option>{c.map(x=><option key={x.id} value={x.id}>{x.contract_code} · {x.title}</option>)}</select></label>
        <div className={styles.two}><label>Valor recebido (MZN)<input name="amount_mzn" type="number" min=".01" step=".01" required/></label><label>Data da transferência<input name="transfer_date" type="date"/></label></div>
        <label>Referência bancária<input name="reference" required minLength={3} maxLength={180}/></label><div className={styles.two}><label>Banco<input name="bank_name"/></label><label>Ordenante<input name="payer_name"/></label></div><label>Link de comprovativo (opcional)<input name="proof_url" type="url"/></label><button type="submit" disabled={!p.length}>Registar pagamento pendente</button>
      </form></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><h2>Contactos institucionais</h2><p>Registe interlocutores, responsáveis de facturação e destinatários dos relatórios, sem criar contas de utilizador.</p><form action={createPartnerContact} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className={styles.two}><label>Nome<input name="full_name" required minLength={2}/></label><label>Função<input name="role_title"/></label></div>
        <div className={styles.two}><label>Email<input name="email" type="email"/></label><label>Telefone<input name="phone"/></label></div>
        <div className={styles.two}><label>Contacto principal<select name="is_primary"><option value="true">Sim</option><option value="false">Não</option></select></label><label>Facturação<select name="is_billing_contact"><option value="false">Não</option><option value="true">Sim</option></select></label></div>
        <label>Recebe relatórios?<select name="receives_reports"><option value="true">Sim</option><option value="false">Não</option></select></label><button type="submit" disabled={!p.length}>Registar contacto</button>
      </form></article>
      <article className={styles.panel}><h2>Entrega de relatório</h2><p>Registe relatórios periódicos ou entregas de campanha. A entrega pode ser feita por email ou link externo, sem login do parceiro.</p><form action={createPartnerReportDelivery} className={styles.form}>
        <label>Entidade<select name="account_id" required>{p.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Contrato<select name="contract_id" defaultValue=""><option value="">Sem contrato</option>{c.map(x=><option key={x.id} value={x.id}>{x.contract_code} · {x.title}</option>)}</select></label>
        <label>Título<input name="title" required/></label>
        <div className={styles.two}><label>Tipo<select name="report_type"><option value="PERFORMANCE">Desempenho</option><option value="FINANCIAL">Financeiro</option><option value="MARKET_INTELLIGENCE">Inteligência de mercado</option><option value="CAMPAIGN">Campanha</option><option value="EXECUTIVE">Executivo</option><option value="OTHER">Outro</option></select></label><label>Canal<select name="delivery_channel"><option value="EMAIL">Email</option><option value="SHARED_LINK">Link partilhado</option><option value="MEETING">Reunião</option><option value="PORTAL">Portal</option><option value="OTHER">Outro</option></select></label></div>
        <div className={styles.two}><label>Período inicial<input name="period_start" type="date"/></label><label>Período final<input name="period_end" type="date"/></label></div>
        <label>Caminho do ficheiro no Storage<input name="storage_path" placeholder="reports/parceiro/relatorio.pdf"/></label><label>Link externo (opcional)<input name="external_url" type="url"/></label>
        <label>Emails destinatários (separados por vírgula)<textarea name="recipient_emails" rows={2}/></label><label>Estado<select name="status"><option value="DRAFT">Rascunho</option><option value="READY">Pronto para envio</option><option value="DELIVERED">Entregue (registar evidência)</option></select></label>
        <button type="submit" disabled={!p.length}>Registar relatório</button>
      </form></article>
    </section>
    <section className={styles.panel}><h2>Entidades e modelos de relacionamento</h2>{partnerError?<p className={styles.error}>Não foi possível carregar as entidades.</p>:<div className={styles.tableWrap}><table><thead><tr><th>Entidade</th><th>Modelo</th><th>Portal</th><th>Contacto</th><th>Estado</th></tr></thead><tbody>{p.map(x=><tr key={x.id}><td><strong>{x.name}</strong><small>{x.legal_name||"Sem denominação legal"}</small></td><td>{({MANAGED:"Gestão interna",STRATEGIC:"Estratégico",HYBRID:"Híbrido",SELF_SERVICE:"Auto-serviço"} as Record<string,string>)[x.operating_model]||x.operating_model}</td><td>{x.portal_enabled?"Disponível":"Não activo"}</td><td>{x.contact_email||x.contact_phone||"—"}</td><td>{x.status}</td></tr>)}</tbody></table></div>}</section>
    <section className={styles.panel}><h2>Contratos</h2><div className={styles.tableWrap}><table><thead><tr><th>Contrato</th><th>Parceiro</th><th>Tipo</th><th>Valor contratado</th><th>Estado</th><th>Período</th></tr></thead><tbody>{c.map(x=><tr key={x.id}><td><strong>{x.contract_code}</strong><small>{x.title}</small></td><td>{partnerName(x.account_id)}</td><td>{x.contract_type}</td><td>{money(x.contracted_amount_mzn)}</td><td>{x.status}</td><td>{date(x.starts_on)} – {date(x.ends_on)}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel}><h2>Execução e pedidos</h2><div className={styles.tableWrap}><table><thead><tr><th>Pedido</th><th>Parceiro</th><th>Serviço</th><th>Origem</th><th>Estado</th><th>Prazo</th></tr></thead><tbody>{e.map(x=><tr key={x.id}><td><strong>{x.title}</strong><small>{x.id.slice(0,8)}</small></td><td>{partnerName(x.account_id)}</td><td>{x.service_type}</td><td>{x.request_source}</td><td>{x.status}</td><td>{date(x.due_at)}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel}><h2>Facturas e documentos</h2><div className={styles.tableWrap}><table><thead><tr><th>Documento</th><th>Parceiro</th><th>Contrato</th><th>Valor</th><th>Estado</th><th>Emissão</th></tr></thead><tbody>{docs.map(x=><tr key={x.id}><td><strong>{x.document_number}</strong><small>{x.document_type}</small></td><td>{partnerName(x.partner_account_id!)}</td><td>{c.find(y=>y.id===x.contract_id)?.contract_code||"—"}</td><td>{money(x.amount_mzn)}</td><td>{x.status}</td><td>{date(x.issued_at)}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel}><h2>Pagamentos e transferências</h2><div className={styles.tableWrap}><table><thead><tr><th>Parceiro</th><th>Valor</th><th>Referência</th><th>Banco / ordenante</th><th>Data</th><th>Estado / acção</th></tr></thead><tbody>{pay.map(x=><tr key={x.id}><td>{partnerName(x.partner_account_id!)}</td><td>{money(x.amount_mzn)}</td><td>{x.reference}</td><td>{[x.bank_name,x.payer_name].filter(Boolean).join(" · ")||"—"}</td><td>{date(x.transfer_date||x.created_at)}</td><td>{x.status==="PENDING"?<form action={verifyPartnerBankTransfer} className={styles.verify}><input type="hidden" name="payment_id" value={x.id}/><input name="verification_notes" placeholder="Nota de validação"/><button type="submit">Confirmar</button></form>:x.status}</td></tr>)}</tbody></table></div><p className={styles.note}>A confirmação regista o estado e o responsável da validação. A conciliação de saldo por contrato é apurada a partir dos documentos e pagamentos confirmados.</p></section>
  </div></main>;
}
