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

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % items.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const slide = items[Math.min(active, items.length - 1)];

  return (
    <section className="directory-ad-slider" aria-label="Publicidade em destaque">
      <div
        className="directory-ad-slide"
        style={slide.image ? { backgroundImage: `linear-gradient(90deg, #102925ee 0%, #173a34dd 58%, #173a34b8 100%), url("${slide.image}")` } : undefined}
      >
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
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
}
