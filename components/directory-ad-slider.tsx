"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type DirectoryAd = {
  label: string;
  title: string;
  text: string;
  image?: string;
  href: string;
};

const fallbackAds: DirectoryAd[] = [
  {
    label: "Espaço publicitário",
    title: "Coloque a sua empresa diante de quem está a procurar.",
    text: "Posições de destaque no directório para campanhas, produtos, serviços e oportunidades.",
    href: "/publicidade",
  },
  {
    label: "Publicidade empresarial",
    title: "Transforme visitas ao directório em novas oportunidades.",
    text: "Apresente a sua marca num espaço de elevada visibilidade dentro do ecossistema MozEmpresas.",
    href: "/publicidade",
  },
  {
    label: "Destaque patrocinado",
    title: "Dê mais visibilidade ao seu negócio.",
    text: "Reserve uma posição comercial e coloque a sua empresa em destaque para o público certo.",
    href: "/publicidade",
  },
];

export function DirectoryAdSlider({ ads = [] }: { ads?: DirectoryAd[] }) {
  const items = ads.length > 0 ? ads : fallbackAds;
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % items.length), 5500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(active), 30);
    return () => window.clearTimeout(timer);
  }, [active]);

  const slide = items[Math.min(active, items.length - 1)];

  return (
    <section className="directory-ad-slider" aria-label="Publicidade em destaque">
      {items.map((item, index) => (
        <div
          key={item.title + index}
          className={"directory-ad-slide directory-ad-layer " + (index === visible ? "is-visible" : "")}
          aria-hidden="true"
          style={item.image ? { backgroundImage: 'url("' + item.image + '")' } : undefined}
        />
      ))}
      <div className="directory-ad-overlay" aria-hidden="true" />
      <div className="directory-ad-content">
        <div className="directory-ad-copy">
          <span className="eyebrow">{slide.label}</span>
          <h2>{slide.title}</h2>
          <p>{slide.text}</p>
        </div>
        <Link href={slide.href} className="btn primary">Conhecer publicidade →</Link>
      </div>
      <div className="directory-ad-dots" aria-label="Publicidade">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.title + index}
            aria-label={"Ver publicidade " + (index + 1)}
            aria-pressed={index === active}
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
}
