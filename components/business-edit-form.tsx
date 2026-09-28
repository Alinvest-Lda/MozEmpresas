"use client";

import { useActionState } from "react";
import type { BusinessState } from "@/lib/businesses/actions";

type Category = { id: string; name: string; slug: string };
type Business = { id:string; name:string; description:string|null; category_id:string|null; location:string|null; phone:string|null; email:string|null; website:string|null; is_public:boolean };

export function BusinessEditForm({ action, business, categories }: { action:(state:BusinessState, formData:FormData)=>Promise<BusinessState>; business:Business; categories:Category[] }) {
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
    <div className="field"><label htmlFor="edit-description">Apresentação da empresa</label><textarea id="edit-description" name="description" rows={6} maxLength={5000} defaultValue={business.description || ""} placeholder="Explique o que a empresa faz, para quem trabalha e o que disponibiliza." /></div>
    <div className="field"><label htmlFor="edit-public">Visibilidade</label><select id="edit-public" name="isPublic" defaultValue={business.is_public ? "true" : "false"}><option value="true">Publicado — aparecer no directório</option><option value="false">Privado — não aparecer no directório</option></select></div>
    {state.error && <p role="alert" className="notice">{state.error}</p>}
    <div className="business-edit-actions"><button className="btn primary" disabled={pending}>{pending ? "A guardar..." : "Guardar alterações"}</button></div>
  </form>;
}