"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    label: "Espaço publicitário",
    title: "Coloque a sua empresa diante de quem está a procurar.",
    text: "Posições de destaque no directório para campanhas, produtos, serviços e oportunidades.",
  },
  {
    label: "Publicidade empresarial",
    title: "Transforme visitas ao directório em novas oportunidades.",
    text: "Apresente a sua marca num espaço de elevada visibilidade dentro do ecossistema MozEmpresas.",
  },
  {
    label: "Destaque patrocinado",
    title: "Dê mais visibilidade ao seu negócio.",
    text: "Reserve uma posição comercial e coloque a sua empresa em destaque para o público certo.",
  },
];

export function DirectoryAdSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[active];

  return (
    <section className="directory-ad-slider" aria-label="Publicidade em destaque">
      <div className="directory-ad-slide">
        <div>
          <span className="eyebrow">{slide.label}</span>
          <h2>{slide.title}</h2>
          <p>{slide.text}</p>
        </div>
        <Link href="/contactos" className="btn primary">Anunciar no MozEmpresas →</Link>
      </div>
      <div className="directory-ad-dots">
        {slides.map((item, index) => (
          <button
            type="button"
            key={item.title}
            aria-label={"Ver publicidade " + (index + 1)}
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
}
