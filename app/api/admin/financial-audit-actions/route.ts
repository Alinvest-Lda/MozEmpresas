import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { enforceRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

const ISSUE_KEY = /^[a-f0-9]{32}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES = new Set(["OPEN","IN_PROGRESS","RESOLVED","IGNORED"]);

export async function GET(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "admin-financial-audit-read", limit: 60, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const issueKey = new URL(request.url).searchParams.get("issue_key") ?? "";
  if (!ISSUE_KEY.test(issueKey)) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const { data, error } = await supabase.rpc("admin_financial_audit_issue_history_f331", { p_issue_key: issueKey });
  if (error) return NextResponse.json({ error: "Não foi possível carregar o histórico." }, { status: 409 });
  return NextResponse.json({ ok: true, result: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "admin-financial-audit-write", limit: 20, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "Pedido demasiado grande." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const issueKey = typeof input.issue_key === "string" ? input.issue_key.trim() : "";
  const status = typeof input.status === "string" ? input.status.trim().toUpperCase() : "";
  if (input.resolution_note !== undefined && input.resolution_note !== null && typeof input.resolution_note !== "string")
    return NextResponse.json({ error: "Nota de tratamento inválida." }, { status: 400 });
  if (input.evidence_reference !== undefined && input.evidence_reference !== null && typeof input.evidence_reference !== "string")
    return NextResponse.json({ error: "Referência de evidência inválida." }, { status: 400 });
  if (input.assigned_to !== undefined && input.assigned_to !== null && typeof input.assigned_to !== "string")
    return NextResponse.json({ error: "Responsável inválido." }, { status: 400 });
  const noteRaw = typeof input.resolution_note === "string" ? input.resolution_note : "";
  const evidenceRaw = typeof input.evidence_reference === "string" ? input.evidence_reference : "";
  const note = noteRaw.trim() ? noteRaw.trim() : null;
  const assigneeRaw = typeof input.assigned_to === "string" ? input.assigned_to.trim() : "";
  const assignee = assigneeRaw || null;
  const evidence = evidenceRaw.trim() ? evidenceRaw.trim() : null;
  if (!ISSUE_KEY.test(issueKey) || !STATES.has(status)) return NextResponse.json({ error: "Identificador ou estado inválido." }, { status: 400 });
  if (status === "RESOLVED" && (!note || !evidence)) return NextResponse.json({ error: "Para resolver, indique nota de tratamento e referência de evidência." }, { status: 400 });
  if (status === "IGNORED" && !note) return NextResponse.json({ error: "Para ignorar, indique o motivo da decisão." }, { status: 400 });
  if (noteRaw.length > 3000) return NextResponse.json({ error: "Nota excede 3000 caracteres." }, { status: 400 });
  if (evidenceRaw.length > 1000) return NextResponse.json({ error: "Referência de evidência excede 1000 caracteres." }, { status: 400 });
  if (assignee && !UUID.test(assignee)) return NextResponse.json({ error: "O responsável deve ser um UUID de utilizador válido." }, { status: 400 });
  if (assignee) {
    const { data: member, error: memberError } = await supabase.from("platform_members").select("user_id,active").eq("user_id",assignee).maybeSingle();
    if (memberError || !member || member.active !== true) return NextResponse.json({ error: "Responsável não é membro activo da plataforma." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("admin_update_financial_audit_issue_f329", {
    p_issue_key: issueKey, p_status: status, p_resolution_note: note,
    p_assigned_to: assignee, p_evidence_reference: evidence,
  });
  if (error) {
    const message = error.message.includes("ISSUE_NOT_IN_CURRENT_AUDIT") ? "Divergência já não consta da auditoria actual." : "Não foi possível guardar a intervenção.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ ok: true, result: data }, { headers: { "Cache-Control": "no-store" } });
}
