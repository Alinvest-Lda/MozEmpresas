"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ads = [
  {
    label: "ESPAÇO PUBLICITÁRIO",
    title: "Apresente a sua empresa onde o mercado procura.",
    text: "Reserve uma posição de destaque no MozEmpresas.",
    action: "Anunciar no MozEmpresas",
  },
  {
    label: "DESTAQUE EMPRESARIAL",
    title: "Dê visibilidade aos seus produtos e serviços.",
    text: "Publicidade pensada para o público empresarial em Moçambique.",
    action: "Conhecer espaços",
  },
  {
    label: "PUBLICIDADE",
    title: "Promova uma campanha, evento ou oportunidade.",
    text: "Use posições estratégicas ao longo do portal.",
    action: "Publicitar",
  },
];

const images = [
  "https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG",
  "https://central.bvm.co.mz/storage/app/public/files/notice/123/7.JPG",
  "https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG",
];

export function AdvertisingHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % ads.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  const item = ads[active];

  return (
    <section className="advertising-hero" aria-label="Publicidade em destaque">
      <div
        className="advertising-backdrop"
        aria-hidden="true"
        style={{ backgroundImage: `url("${images[active]}")` }}
      />
      <div className="container">
        <div className="advertising-content">
          <span className="ad-kicker">{item.label}</span>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
          <Link className="ad-cta" href="/contactos">
            {item.action} <span>→</span>
          </Link>
        </div>
        <div className="ad-dots" aria-label="Anúncios">
          {ads.map((adItem, index) => (
            <button
              key={adItem.title}
              type="button"
              aria-label={`Ver anúncio ${index + 1}`}
              aria-pressed={index === active}
              className={index === active ? "active" : ""}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
