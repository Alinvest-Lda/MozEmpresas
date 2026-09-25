"use client";

import { useEffect, useState } from "react";

const ads = [
  {
    label: "ESPAÇO PUBLICITÁRIO",
    title: "Apresente a sua empresa onde o mercado procura.",
    text: "Reserve uma posição de destaque no MozEmpresas.",
    action: "Anunciar no MozEmpresas",
    image: "https://images.pexels.com/photos/4427622/pexels-photo-4427622.jpeg?auto=compress&cs=tinysrgb&w=1400",
  },
  {
    label: "DESTAQUE EMPRESARIAL",
    title: "Dê visibilidade aos seus produtos e serviços.",
    text: "Publicidade pensada para o público empresarial em Moçambique.",
    action: "Conhecer espaços",
    image: "https://images.pexels.com/photos/5668508/pexels-photo-5668508.jpeg?auto=compress&cs=tinysrgb&w=1400",
  },
  {
    label: "PUBLICIDADE",
    title: "Promova uma campanha, evento ou oportunidade.",
    text: "Use posições estratégicas ao longo do portal.",
    action: "Publicitar",
    image: "https://images.pexels.com/photos/4427622/pexels-photo-4427622.jpeg?auto=compress&cs=tinysrgb&w=1400",
  },
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
      <div className="advertising-backdrop" style={{ backgroundImage: `url("${item.image}")` }} />
      <div className="container">
        <div className="advertising-content">
          <span className="ad-kicker">{item.label}</span>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
          <button className="ad-cta">{item.action} <span>→</span></button>
        </div>
        <div className="ad-dots" aria-label="Anúncios">
          {ads.map((adItem, index) => (
            <button key={adItem.title} aria-label={`Ver anúncio ${index + 1}`} className={index === active ? "active" : ""} onClick={() => setActive(index)} />
          ))}
        </div>
      </div>
    </section>
  );
}
