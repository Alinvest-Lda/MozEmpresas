"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ads = [
  { label: "ESPAÇO PUBLICITÁRIO", title: "Apresente a sua empresa onde o mercado procura.", text: "Reserve uma posição de destaque no MozEmpresas.", action: "Anunciar no MozEmpresas", image: "https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG" },
  { label: "DESTAQUE EMPRESARIAL", title: "Dê visibilidade aos seus produtos e serviços.", text: "Publicidade pensada para o público empresarial em Moçambique.", action: "Conhecer espaços", image: "https://central.bvm.co.mz/storage/app/public/files/notice/123/7.JPG" },
  { label: "PUBLICIDADE", title: "Promova uma campanha, evento ou oportunidade.", text: "Use uma posição estratégica no portal para chegar ao público empresarial.", action: "Publicitar no portal", image: "https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG" },
];

export function AdvertisingHero() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % ads.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(active), 30);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <section className="advertising-hero" aria-label="Espaço publicitário em destaque">
      {ads.map((ad, index) => (
        <div key={ad.title} className={`advertising-backdrop ${index === visible ? "is-visible" : ""}`} aria-hidden="true" style={{ backgroundImage: `url("${ad.image}")` }} />
      ))}
      <div className="advertising-overlay" aria-hidden="true" />
      <div className="container advertising-hero-container">
        <div className="advertising-content">
          <span className="ad-kicker">{ads[active].label}</span>
          <h2>{ads[active].title}</h2>
          <p>{ads[active].text}</p>
          <Link className="ad-cta" href="/contactos">{ads[active].action} <span>→</span></Link>
        </div>
        <div className="ad-dots" aria-label="Publicidade em destaque">
          {ads.map((ad, index) => <button key={ad.title} type="button" aria-label={`Ver anúncio ${index + 1}`} aria-pressed={index === active} className={index === active ? "active" : ""} onClick={() => setActive(index)} />)}
        </div>
      </div>
    </section>
  );
}
