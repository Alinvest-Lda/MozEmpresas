"use client";

import { useActionState } from "react";
import type { BusinessState } from "@/lib/businesses/actions";

type Category = { id: string; name: string; slug: string };
type Business = { id:string; name:string; description:string|null; category_id:string|null; location:string|null; phone:string|null; email:string|null; website:string|null; logo_url:string|null; cover_url:string|null; is_public:boolean };
type PortfolioItem = { id:string; image_url:string; title:string|null; sort_order:number };

export function BusinessEditForm({ action, business, categories, portfolio=[] }: { action:(state:BusinessState, formData:FormData)=>Promise<BusinessState>; business:Business; categories:Category[]; portfolio?:PortfolioItem[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="business-form">
    <input type="hidden" name="businessId" value={business.id} />
    <div className="business-form-grid">
      <div className="field"><label htmlFor="edit-name">Nome da empresa</label><input id="edit-name" name="name" defaultValue={business.name} required maxLength={160} /></div>
      <div className="field"><label htmlFor="edit-category">Actividade principal</label><select id="edit-category" name="categoryId" defaultValue={business.category_id || ""}><option value="">Seleccionar actividade</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    </div>
    <div className="business-form-grid">
      <div className="field"><label htmlFor="edit-location">Localização</label><input id="edit-location" name="location" defaultValue={business.location || ""} maxLength={160} /></div>
      <div className="field"><label htmlFor="edit-phone">Telefone</label><input id="edit-phone" name="phone" defaultValue={business.phone || ""} maxLength={40} /></div>
    </div>
    <div className="business-form-grid">
      <div className="field"><label htmlFor="edit-email">Email empresarial</label><input id="edit-email" name="email" type="email" defaultValue={business.email || ""} /></div>
      <div className="field"><label htmlFor="edit-website">Website</label><input id="edit-website" name="website" type="url" defaultValue={business.website || ""} /></div>
    </div>
    <div className="business-form-grid"><div className="field"><label htmlFor="edit-logo">URL do logótipo</label><input id="edit-logo" name="logoUrl" type="url" defaultValue={business.logo_url || ""} placeholder="https://..." /></div><div className="field"><label htmlFor="edit-cover">URL da capa</label><input id="edit-cover" name="coverUrl" type="url" defaultValue={business.cover_url || ""} placeholder="https://..." /></div></div>
    <div className="field"><label htmlFor="edit-description">Apresentação da empresa</label><textarea id="edit-description" name="description" rows={6} maxLength={5000} defaultValue={business.description || ""} placeholder="Explique o que a empresa faz, para quem trabalha e o que disponibiliza." /></div>
    <section className="business-portfolio-editor">
      <div>
        <span className="dashboard-kicker">Portfólio</span>
        <h3>Mostre o que a empresa faz</h3>
        <p>Adicione até 5 imagens de produtos, serviços, projectos ou trabalhos. Estas imagens podem aparecer no directório e no perfil público.</p>
      </div>
      <div className="portfolio-url-grid">
        {[0,1,2,3,4].map((index) => {
          const item=portfolio[index];
          return <label className="portfolio-url-field" key={index}><span>Imagem {index+1}</span><input name={"portfolioImage"+index} type="url" defaultValue={item?.image_url||""} placeholder="https://..." /><input name={"portfolioTitle"+index} defaultValue={item?.title||""} placeholder="Título opcional" /></label>;
        })}
      </div>
    </section>
    <div className="field"><label htmlFor="edit-public">Visibilidade</label><select id="edit-public" name="isPublic" defaultValue={business.is_public ? "true" : "false"}><option value="true">Publicado — aparecer no directório</option><option value="false">Privado — não aparecer no directório</option></select></div>
    {state.error && <p role="alert" className="notice">{state.error}</p>}
    <div className="business-edit-actions"><button className="btn primary" disabled={pending}>{pending ? "A guardar..." : "Guardar alterações"}</button></div>
  </form>;
}