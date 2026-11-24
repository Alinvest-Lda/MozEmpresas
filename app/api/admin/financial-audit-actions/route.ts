import { NextResponse } from "next/server";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const ISSUE_KEY = /^[a-f0-9]{32}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES = new Set(["OPEN","IN_PROGRESS","RESOLVED","IGNORED"]);

export async function GET(request: Request) {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const issueKey = new URL(request.url).searchParams.get("issue_key") ?? "";
  if (!ISSUE_KEY.test(issueKey)) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const { data, error } = await supabase.rpc("admin_financial_audit_issue_history_f331", { p_issue_key: issueKey });
  if (error) return NextResponse.json({ error: "Não foi possível carregar o histórico." }, { status: 409 });
  return NextResponse.json({ ok: true, result: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const issueKey = typeof input.issue_key === "string" ? input.issue_key : "";
  const status = typeof input.status === "string" ? input.status : "";
  const note = typeof input.resolution_note === "string" ? input.resolution_note : null;
  const assignee = typeof input.assigned_to === "string" && input.assigned_to.trim() ? input.assigned_to.trim() : null;
  const evidence = typeof input.evidence_reference === "string" ? input.evidence_reference : null;
  if (!ISSUE_KEY.test(issueKey) || !STATES.has(status)) return NextResponse.json({ error: "Identificador ou estado inválido." }, { status: 400 });
  if (status === "RESOLVED" && (!note?.trim() || !evidence?.trim())) return NextResponse.json({ error: "Para resolver, indique nota de tratamento e referência de evidência." }, { status: 400 });
  if (note && note.length > 3000) return NextResponse.json({ error: "Nota excede 3000 caracteres." }, { status: 400 });
  if (evidence && evidence.length > 1000) return NextResponse.json({ error: "Referência de evidência excede 1000 caracteres." }, { status: 400 });
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
