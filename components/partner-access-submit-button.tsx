"use client";

import { useFormStatus } from "react-dom";

export function PartnerAccessSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary partner-access-submit" type="submit" disabled={pending} aria-live="polite">
      {pending ? <><span className="partner-access-submit-spinner" aria-hidden="true" />A criar acesso...</> : <>Criar acesso de parceiro <span aria-hidden="true">→</span></>}
    </button>
  );
}
