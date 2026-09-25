"use client";

import { useEffect, useState } from "react";

const ads = [
  { label: "ESPAÇO PUBLICITÁRIO", title: "Apresente a sua empresa a quem procura fornecedores.", text: "Reserve um espaço de destaque no MozEmpresas.", action: "Anunciar no MozEmpresas" },
  { label: "DESTAQUE EMPRESARIAL", title: "Coloque a sua marca onde o mercado pesquisa.", text: "Publicidade para empresas, produtos, serviços e eventos.", action: "Conhecer espaços" },
  { label: "PUBLICIDADE", title: "Promova uma oferta, campanha ou oportunidade.", text: "Use posições estratégicas ao longo do portal para aumentar a visibilidade.", action: "Publicitar" },
];

export function AdvertisingHero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % ads.length), 5500);
    return () => window.clearInterval(timer);
  }, []);
  const item = ads[active];

  return (
    <section className="advertising-hero" aria-label="Publicidade em destaque">
      <div className="container">
        <div className="advertising-hero-inner">
          <div>
            <span className="ad-kicker">{item.label}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <button className="ad-cta">{item.action} <span>→</span></button>
          </div>
          <div className="ad-visual"><span>AD</span><small>728 × 250</small></div>
          <div className="ad-dots" aria-label="Anúncios">
            {ads.map((adItem, index) => (
              <button key={adItem.title} aria-label={`Ver anúncio ${index + 1}`} className={index === active ? "active" : ""} onClick={() => setActive(index)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
