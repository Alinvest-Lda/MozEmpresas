"use client";

import { useState } from "react";

export function PartnerAccessLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="partner-access-link">
      <code>{url}</code>
      <button type="button" onClick={copyLink} className="btn primary">{copied ? "Link copiado" : "Copiar link"}</button>
      <style jsx>{`
        .partner-access-link{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-top:12px}
        .partner-access-link code{display:block;min-width:0;overflow-wrap:anywhere;padding:12px 13px;border:1px solid #dce8e1;border-radius:9px;background:#fff;color:#315c4a;font-size:11px;line-height:1.6}
        .partner-access-link button{min-height:40px;white-space:nowrap}
        @media(max-width:640px){.partner-access-link{grid-template-columns:1fr}.partner-access-link button{width:100%}}
      `}</style>
    </div>
  );
}
