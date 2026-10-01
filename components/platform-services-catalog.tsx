"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  price: number | string | null;
  currency: string | null;
  billing: string | null;
  default_term_days?: number | null;
};

const categoryCopy: Record<string, string> = {
  Presença: "Estruture e fortaleça a forma como a sua empresa aparece na plataforma.",
  Visibilidade: "Ganhe exposição adicional quando precisa de maior alcance.",
  Publicidade: "Active espaços pagos de comunicação dentro do ecossistema.",
  Contratação: "Apoio da plataforma para encontrar ou avaliar fornecedores.",
  Inteligência: "Transforme informação empresarial em apoio à decisão.",
};

function money(service: Service) {
  if (service.price == null) return "Sob consulta";
  return Number(service.price).toLocaleString("pt-MZ") + " " + (service.currency || "MZN");
}

function termLabel(service: Service) {
  if (service.billing === "MONTHLY") return "Recorrente · mensal";
  if (service.billing === "ANNUAL") return "Recorrente · anual";
  if (service.default_term_days) return "Prazo · " + service.default_term_days + " dias";
  return "Serviço pontual";
}

export function PlatformServicesCatalog({ services }: { services: Service[] }) {
  const categories = useMemo(
    () => Array.from(new Set(services.map((service) => service.category))),
    [services],
  );
  const [category, setCategory] = useState(categories[0] ?? "");
  const visible = services.filter((service) => service.category === category);

  return (
    <section className="services-catalog">
      <nav className="service-category-nav" aria-label="Áreas de serviços">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            <span>{item}</span>
            <small>{services.filter((service) => service.category === item).length}</small>
          </button>
        ))}
      </nav>

      <div className="service-category-intro">
        <div>
          <span className="dashboard-kicker">Área de apoio</span>
          <h2>{category}</h2>
          <p>{categoryCopy[category] || "Serviços da plataforma para apoiar operações específicas da sua empresa."}</p>
        </div>
        <span className="service-category-count">{visible.length} opções</span>
      </div>

      <div className="service-catalog-list">
        {visible.map((service, index) => (
          <article className="service-catalog-row" key={service.id}>
            <div className="service-catalog-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="service-catalog-main">
              <span className="dashboard-kicker">{service.category}</span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
            </div>
            <div className="service-catalog-term">
              <strong>{termLabel(service)}</strong>
              <span>{service.billing === "MONTHLY" || service.billing === "ANNUAL" ? "Renovável conforme o período contratado" : "Prazo definido para a execução"}</span>
            </div>
            <div className="service-catalog-price">
              <strong>{money(service)}</strong>
              <span>{service.billing === "MONTHLY" ? "/ mês" : service.billing === "ANNUAL" ? "/ ano" : "valor do serviço"}</span>
            </div>
            <Link href={"/dashboard/servicos/" + service.slug} className="service-catalog-action">
              Ver condições e contratar <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
