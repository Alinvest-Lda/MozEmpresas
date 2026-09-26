import { AdvertisingRequestForm } from "@/components/advertising-request-form";

const packages = [
  { name: "Billboard", eyebrow: "Máxima visibilidade", text: "Posição fixa no topo do directório, com rotação entre campanhas.", placement: "DIRECTORY_BILLBOARD" },
  { name: "Empresa em destaque", eyebrow: "Conversão", text: "Apresente a sua empresa num bloco próprio antes dos resultados orgânicos.", placement: "DIRECTORY_FEATURED" },
  { name: "In-feed", eyebrow: "Contexto", text: "Apareça durante a navegação dos resultados do directório.", placement: "DIRECTORY_INFEED" },
];

export default function Publicidade() {
  return (
    <main className="page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Publicidade no MozEmpresas</span>
          <h1>Coloque a sua empresa onde o mercado está a procurar.</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Escolha uma posição, indique o período e o objectivo da campanha. A equipa comercial confirma disponibilidade, materiais, preço e condições antes da activação.
          </p>
        </section>

        <section className="grid" style={{ marginBottom: 48 }}>
          {packages.map((item) => (
            <article className="card" key={item.placement} style={{ padding: 24 }}>
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