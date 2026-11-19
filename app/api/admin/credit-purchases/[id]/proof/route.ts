import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL_SECONDS = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Provides short-lived, authenticated access to a credit-purchase proof.
 * The storage path is never returned to the browser.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("credit_purchase_requests")
    .select("proof_path")
    .eq("id", id)
    .maybeSingle();

  if (purchaseError) {
    return NextResponse.json({ error: "Não foi possível consultar o pedido." }, { status: 500 });
  }
  if (!purchase?.proof_path || typeof purchase.proof_path !== "string") {
    return NextResponse.json({ error: "Este pedido não tem comprovativo disponível." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(purchase.proof_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Não foi possível disponibilizar o comprovativo." }, { status: 503 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 303,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
