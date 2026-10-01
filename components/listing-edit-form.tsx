"use client";

import { useActionState } from "react";

type Business = { id: string; name: string };
type Listing = {
  id: string; title: string; description: string; type: "PRODUCT"|"SERVICE";
  price: number|null; location: string|null; business_id: string|null;
  status: string;
};

type ListingActionState = { error?: string; success?: string };

export function ListingEditForm({
  action, listing, businesses,
}: {
  action: (state: ListingActionState, formData: FormData) => Promise<ListingActionState>;
  listing: Listing;
  businesses: Business[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="business-form" encType="multipart/form-data">
      <input type="hidden" name="listing_id" value={listing.id} />
      <div className="business-form-grid">
        <div className="field"><label htmlFor="listing-title">Título da oferta</label><input id="listing-title" name="title" defaultValue={listing.title} required maxLength={180} /></div>
        <div className="field"><label htmlFor="listing-type">Tipo</label><select id="listing-type" name="type" defaultValue={listing.type}><option value="PRODUCT">Produto</option><option value="SERVICE">Serviço</option></select></div>
      </div>
      <div className="business-form-grid">
        <div className="field"><label htmlFor="listing-business">Empresa</label><select id="listing-business" name="business_id" defaultValue={listing.business_id || ""} required>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div className="field"><label htmlFor="listing-price">Preço (MZN)</label><input id="listing-price" name="price" type="number" min="0" step="0.01" defaultValue={listing.price ?? ""} placeholder="Sob consulta" /></div>
      </div>
      <div className="field"><label htmlFor="listing-location">Localização</label><input id="listing-location" name="location" defaultValue={listing.location || ""} maxLength={160} placeholder="Maputo, Moçambique" /></div>
      <div className="field"><label htmlFor="listing-attachments">Novos anexos</label><input id="listing-attachments" name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx" multiple /><small className="muted">Até 10 ficheiros adicionais, no máximo 10 MB cada.</small></div>
      <div className="field"><label htmlFor="listing-description">Descrição</label><textarea id="listing-description" name="description" rows={8} required maxLength={8000} defaultValue={listing.description} /></div>
      <div className="field"><label htmlFor="listing-status">Estado</label><select id="listing-status" name="status" defaultValue={listing.status}><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option><option value="PAUSED">Pausado</option><option value="SOLD_OUT">Esgotado</option><option value="ARCHIVED">Arquivado</option></select></div>
      {state.error && <p role="alert" className="notice">{state.error}</p>}
      <div className="business-edit-actions"><button className="btn primary" disabled={pending}>{pending ? "A guardar..." : "Guardar oferta"}</button></div>
    </form>
  );
}
