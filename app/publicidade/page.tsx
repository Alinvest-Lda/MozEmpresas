import { AdvertisingRequestForm } from "@/components/advertising-request-form";

const packages = [
  { name: "Hero / topo", eyebrow: "Página inicial", text: "Maior visibilidade na entrada do ecossistema. Ideal para campanhas institucionais e mensagens de grande alcance." },
  { name: "Billboard", eyebrow: "Directório e produtos", text: "Faixa de destaque antes ou entre blocos de descoberta. Ideal para marcas, ofertas e campanhas." },
  { name: "Destaque contextual", eyebrow: "Categoria / conteúdo", text: "Presença associada ao contexto em que o público está a pesquisar ou consumir conteúdo." },
  { name: "In-feed", eyebrow: "Navegação", text: "Formato integrado ao fluxo de conteúdo, adequado para campanhas que precisam de contexto." },
];

export default function Publicidade() {
  return (
    <main className="page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Publicidade no MozEmpresas</span>
          <h1>Coloque a sua empresa onde o mercado está a procurar.</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Escolha onde quer aparecer, a posição, o formato e o período da campanha. A equipa comercial confirma disponibilidade, materiais, preço e condições antes da activação.
          </p>
        </section>

        <section className="grid" style={{ marginBottom: 48 }}>
          {packages.map((item) => (
            <article className="card" key={item.name} style={{ padding: 24 }}>
              <span className="eyebrow">{item.eyebrow}</span>
              <h2 style={{ marginTop: 10 }}>{item.name}</h2>
              <p className="muted">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="business-profile" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Solicitar campanha</span>
            <h2 style={{ margin: "10px 0 8px" }}>Vamos preparar a sua proposta.</h2>
            <p className="muted" style={{ maxWidth: 600, marginBottom: 20 }}>
              O pedido não activa automaticamente uma campanha. Primeiro registamos a necessidade, confirmamos a posição e enviamos as condições comerciais. Após confirmação e pagamento, a campanha é aprovada e entra no inventário activo pelo período contratado.
            </p>
            <div className="notice">
              <strong>Fluxo comercial</strong><br />
              Pedido → contacto comercial → proposta → confirmação → pagamento → aprovação → publicação → expiração.
            </div>
          </div>
          <AdvertisingRequestForm />
        </section>
      </div>
    </main>
  );
}