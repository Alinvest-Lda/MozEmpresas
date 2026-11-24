import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { constants, createPublicKey, publicEncrypt } from "node:crypto";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEST_KEY = "mpesa-sandbox-c2b-500-258842553641-v1";
const MSISDN = "258842553641";
const AMOUNT = "500";
const SHORTCODE = "902809";
const ORIGIN = Deno.env.get("MPESA_ORIGIN") ?? "developer.mpesa.vm.co.mz";

const admin = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function required(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error("Missing server configuration: " + name);
  return value;
}

function bearerToken(apiKey: string, publicKeyBase64: string): string {
  if (apiKey.length !== 32) throw new Error("Invalid M-Pesa API key configuration.");
  const der = Buffer.from(publicKeyBase64.replace(/\s+/g, ""), "base64");
  const key = createPublicKey({ key: der, format: "der", type: "spki" });
  if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails?.modulusLength !== 4096) {
    throw new Error("Invalid M-Pesa RSA public key configuration.");
  }
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(apiKey, "utf8")).toString("base64");
}

async function authorize(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anon) throw new Error("Missing Supabase Auth configuration.");
  const userClient = createClient(PROJECT_URL, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) return null;
  const { data: member, error: memberError } = await admin
    .from("platform_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .eq("active", true)
    .maybeSingle();
  if (memberError || !member) return null;
  return user;
}

async function loadConfig() {
  if (required("MPESA_ENVIRONMENT") !== "sandbox") throw new Error("Only M-Pesa Sandbox is permitted.");
  const base = new URL(required("MPESA_API_BASE_URL"));
  if (base.protocol !== "https:" || base.hostname !== "api.sandbox.vm.co.mz") {
    throw new Error("M-Pesa Sandbox gateway mismatch.");
  }
  const apiKey = required("MPESA_API_KEY");
  const publicKey = required("MPESA_PUBLIC_KEY");
  const origin = required("MPESA_ORIGIN") || ORIGIN;
  const c2bPort = required("MPESA_C2B_PORT");
  const statusPort = required("MPESA_STATUS_PORT");
  const serviceProviderCode = required("MPESA_SERVICE_PROVIDER_CODE");
  if (serviceProviderCode !== SHORTCODE || c2bPort !== "18352" || statusPort !== "18353") {
    throw new Error("M-Pesa Sandbox routing configuration mismatch.");
  }
  return { base, apiKey, publicKey, origin, c2bPort, statusPort, serviceProviderCode };
}

async function providerRequest<T>(cfg: Awaited<ReturnType<typeof loadConfig>>, path: string, port: string, method: "GET" | "POST", payload?: Record<string, string>): Promise<T> {
  const url = new URL(cfg.base);
  url.port = port;
  url.pathname = path;
  if (method === "GET" && payload) for (const [k,v] of Object.entries(payload)) url.searchParams.set(k,v);
  const response = await fetch(url, {
    method,
    headers: {
      authorization: "Bearer " + bearerToken(cfg.apiKey, cfg.publicKey),
      "content-type": "application/json",
      accept: "application/json",
      origin: cfg.origin,
    },
    ...(method === "POST" && payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data: Record<string, unknown>;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("M-Pesa returned a non-JSON response (HTTP " + response.status + ")."); }
  if (!response.ok) throw new Error("M-Pesa HTTP " + response.status + ": " + String(data.output_ResponseDesc ?? "request rejected"));
  return data as T;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await authorize(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (req.method === "POST") {
      if (Deno.env.get("MPESA_SANDBOX_TEST_ENABLED") !== "true") {
        return json({ error: "Sandbox test is disabled until the server-side enable flag is configured." }, 503);
      }
      const cfg = await loadConfig();
      const { data: existing, error: readError } = await admin
        .from("mpesa_sandbox_test_runs").select("*").eq("test_key", TEST_KEY).maybeSingle();
      if (readError) throw new Error("Unable to read test ledger.");
      if (existing) return json({ result: "already_attempted", payment_request_sent_previously: true, test: existing }, 409);

      const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
      const thirdPartyReference = "METEST" + suffix;
      const transactionReference = "MTEST" + suffix;
      const { data: inserted, error: insertError } = await admin.from("mpesa_sandbox_test_runs").insert({
        test_key: TEST_KEY, user_id: user.id, customer_msisdn: MSISDN, amount: 500,
        third_party_reference: thirdPartyReference, transaction_reference: transactionReference, status: "REQUESTING",
      }).select("*").single();
      if (insertError || !inserted) return json({ error: "Test already reserved or ledger unavailable; no duplicate request sent." }, 409);

      try {
        const result = await providerRequest<Record<string, unknown>>(cfg, "/ipg/v1x/c2bPayment/singleStage/", cfg.c2bPort, "POST", {
          input_TransactionReference: transactionReference,
          input_CustomerMSISDN: MSISDN,
          input_Amount: AMOUNT,
          input_ThirdPartyReference: thirdPartyReference,
          input_ServiceProviderCode: SHORTCODE,
        });
        const code = String(result.output_ResponseCode ?? "");
        const accepted = code === "INS-0";
        await admin.from("mpesa_sandbox_test_runs").update({
          status: accepted ? "ACCEPTED" : "REJECTED",
          provider_conversation_id: result.output_ConversationID ?? null,
          provider_response_code: code || null,
          provider_response_desc: result.output_ResponseDesc ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", inserted.id);
        return json({ result: accepted ? "request_accepted_by_gateway" : "gateway_response_received", test: {
          msisdn: MSISDN, amount_mzn: 500, third_party_reference: thirdPartyReference,
          conversation_id: result.output_ConversationID ?? null, response_code: code,
          response_description: result.output_ResponseDesc ?? null, status: accepted ? "ACCEPTED" : "REJECTED",
        }});
      } catch (error) {
        await admin.from("mpesa_sandbox_test_runs").update({
          status: "UNKNOWN", provider_response_desc: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider outcome",
          updated_at: new Date().toISOString(),
        }).eq("id", inserted.id);
        return json({ result: "unknown_outcome_do_not_retry", message: "The provider outcome is uncertain. Query status before any further attempt.", third_party_reference: thirdPartyReference }, 502);
      }
    }

    const cfg = await loadConfig();
    const { data: test, error: testError } = await admin.from("mpesa_sandbox_test_runs")
      .select("*").eq("test_key", TEST_KEY).maybeSingle();
    if (testError) throw new Error("Unable to load test record.");
    if (!test) return json({ error: "No Sandbox test request exists yet." }, 404);
    const result = await providerRequest<Record<string, unknown>>(cfg, "/ipg/v1x/queryTransactionStatus/", cfg.statusPort, "GET", {
      input_ThirdPartyReference: test.third_party_reference,
      input_QueryReference: test.transaction_reference,
      input_ServiceProviderCode: SHORTCODE,
    });
    const returnedRef = String(result.output_ThirdPartyReference ?? "");
    if (returnedRef !== test.third_party_reference) return json({ error: "Provider reference mismatch; status not applied." }, 409);
    return json({ result: "status_retrieved", test: {
      msisdn: test.customer_msisdn, amount_mzn: Number(test.amount),
      third_party_reference: test.third_party_reference,
      conversation_id: result.output_ConversationID ?? test.provider_conversation_id,
      response_code: result.output_ResponseCode ?? null,
      response_description: result.output_ResponseDesc ?? null,
      transaction_status: result.output_ResponseTransactionStatus ?? "N/A",
    }});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return json({ error: message }, 503);
  }
});
