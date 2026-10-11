"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordConversionEvent } from "@/components/platform-tracking";

type SearchEntity = "businesses" | "marketplace" | "opportunities";
type FavoriteEntity = "business" | "listing" | "opportunity";

export function SaveSearchButton({
  entityType,
  title,
  filters,
  nextPath,
}: {
  entityType: SearchEntity;
  title: string;
  filters: Record<string, string>;
  nextPath: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=" + encodeURIComponent(nextPath));
        return;
      }
      const { error } = await supabase.from("user_saved_searches").insert({
        user_id: user.id,
        title,
        entity_type: entityType,
        filters,
        alert_enabled: true,
      });
      if (error?.code === "23505") {
        setMessage("Esta pesquisa já está guardada e os alertas estão activos.");
      } else if (error) {
        setMessage("Não foi possível guardar a pesquisa. Tente novamente.");
      } else {
        await recordConversionEvent({eventType:"SEARCH_SAVED",entityType,source:"saved_search_button",metadata:{title}});
        setMessage("Pesquisa guardada. Receberá avisos na sua área quando houver novas correspondências.");
      }
    } catch {
      setMessage("Não foi possível guardar a pesquisa. Verifique a ligação e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="moz-save-action">
    <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? "A guardar…" : "Guardar pesquisa + alertas"}</button>
    {message && <p role="status">{message}</p>}
  </div>;
}

export function FavoriteButton({
  entityType,
  entityId,
  title,
  href,
}: {
  entityType: FavoriteEntity;
  entityId: string;
  title: string;
  href: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (busy || saved) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=" + encodeURIComponent(href));
        return;
      }
      const { error } = await supabase.from("user_favorites").insert({
        user_id: user.id, entity_type: entityType, entity_id: entityId, title, href,
      });
      if (error?.code === "23505") {
        setSaved(true);
        setMessage("Já está nos seus favoritos.");
      } else if (error) {
        setMessage("Não foi possível guardar este item.");
      } else {
        await recordConversionEvent({eventType:"FAVORITE_SAVED",entityType,entityId,source:"favorite_button"});
        setSaved(true);
        setMessage("Adicionado aos favoritos.");
      }
    } catch {
      setMessage("Não foi possível guardar este item.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="moz-save-action">
    <button type="button" className="btn" onClick={save} disabled={busy || saved}>{busy ? "A guardar…" : saved ? "Guardado ✓" : "Guardar nos favoritos"}</button>
    {message && <p role="status">{message}</p>}
  </div>;
}

export function RemoveSavedItem({ kind, id }: { kind: "favorite" | "search"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const table = kind === "favorite" ? "user_favorites" : "user_saved_searches";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage("Não foi possível remover.");
    else router.refresh();
    setBusy(false);
  }
  return <div className="moz-save-action">
    <button type="button" className="btn" onClick={remove} disabled={busy}>{busy ? "A remover…" : "Remover"}</button>
    {message && <p role="status">{message}</p>}
  </div>;
}
