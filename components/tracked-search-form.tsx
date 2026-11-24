"use client";

import { recordConversionEvent } from "@/components/platform-tracking";

export function TrackedSearchForm({ query, type }: { query: string; type: "all" | "business" | "listing" | "opportunity" }) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const searchTerm = String(data.get("q") || "").trim();
    const selectedType = String(data.get("tipo") || "all");
    if (searchTerm.length >= 2) {
      await recordConversionEvent({
        eventType: "SEARCH_SUBMITTED",
        entityType: "search",
        source: "global_search",
        metadata: { query_length: searchTerm.length, result_type: selectedType },
      });
    }
    form.submit();
  }

  return (
    <form className="global-search-form" action="/pesquisa" onSubmit={handleSubmit}>
      <label className="global-search-query">
        <span>O que procura?</span>
        <div className="global-search-input">
          <b aria-hidden="true">⌕</b>
          <input name="q" defaultValue={query} placeholder="Empresa, produto, serviço, oportunidade..." autoFocus />
          <kbd>⌘ K</kbd>
        </div>
      </label>
      <div className="global-search-form-side">
        <label>
          <span>Pesquisar em</span>
          <select name="tipo" defaultValue={type}>
            <option value="all">Tudo</option>
            <option value="business">Empresas</option>
            <option value="listing">Produtos e serviços</option>
            <option value="opportunity">Oportunidades</option>
          </select>
        </label>
        <button className="btn primary" type="submit">Pesquisar →</button>
      </div>
    </form>
  );
}
