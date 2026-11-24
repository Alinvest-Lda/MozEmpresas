import "server-only";

import { constants, createPublicKey, publicEncrypt } from "node:crypto";

const C2B_PATH = "/ipg/v1x/c2bPayment/singleStage/";
const STATUS_PATH = "/ipg/v1x/queryTransactionStatus/";
const DEFAULT_TIMEOUT_MS = 15_000;

export type MpesaConfig = {
  apiKey: string;
  publicKey: string;
  baseUrl: string;
  origin: string;
  c2bPort: string;
  statusPort: string;
  timeoutMs?: number;
};

export type MpesaC2BInput = {
  transactionReference: string;
  customerMsisdn: string;
  amount: string;
  thirdPartyReference: string;
  serviceProviderCode: string;
};

export type MpesaC2BResponse = {
  output_ThirdPartyReference?: string;
  output_ConversationID?: string;
  output_ResponseCode?: string;
  output_ResponseDesc?: string;
};

export type MpesaStatusInput = {
  thirdPartyReference: string;
  queryReference: string;
  serviceProviderCode: string;
};

export type MpesaStatusResponse = {
  output_ConversationID?: string;
  output_ResponseDesc?: string;
  output_ResponseCode?: string;
  output_ThirdPartyReference?: string;
  output_ResponseTransactionStatus?: "Cancelled" | "Completed" | "Expired" | "N/A" | string;
};

export class MpesaApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly responseCode?: string,
    readonly responseDescription?: string,
  ) {
    super(message);
    this.name = "MpesaApiError";
  }
}

/**
 * The authenticated Vodacom portal's Java SDK encrypts the 32-character API
 * key with the X.509-encoded RSA public key and sends the Base64 ciphertext
 * as the Bearer credential. Java Cipher.getInstance("RSA") uses PKCS#1 v1.5
 * padding with the standard JCE provider.
 */
export function createMpesaBearerToken(apiKey: string, publicKeyBase64: string): string {
  if (!apiKey || !publicKeyBase64) {
    throw new Error("M-Pesa API credentials are not configured.");
  }
  if (apiKey.length !== 32) {
    throw new Error("M-Pesa API Key must contain exactly 32 characters.");
  }

  let der: Buffer;
  try {
    der = Buffer.from(publicKeyBase64.replace(/\s+/g, ""), "base64");
    if (der.length === 0) throw new Error("Empty public key.");
  } catch {
    throw new Error("M-Pesa public key is invalid.");
  }

  try {
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails?.modulusLength !== 4096) {
      throw new Error("Unexpected RSA public key.");
    }
    return publicEncrypt(
      { key, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(apiKey, "utf8"),
    ).toString("base64");
  } catch {
    throw new Error("Unable to generate M-Pesa authorization token.");
  }
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`M-Pesa configuration ${name} is missing.`);
  return normalized;
}

export function getMpesaConfigFromEnv(): MpesaConfig {
  return {
    apiKey: required(process.env.MPESA_API_KEY, "MPESA_API_KEY"),
    publicKey: required(process.env.MPESA_PUBLIC_KEY, "MPESA_PUBLIC_KEY"),
    baseUrl: required(process.env.MPESA_API_BASE_URL, "MPESA_API_BASE_URL"),
    origin: required(process.env.MPESA_ORIGIN, "MPESA_ORIGIN"),
    c2bPort: required(process.env.MPESA_C2B_PORT, "MPESA_C2B_PORT"),
    statusPort: required(process.env.MPESA_STATUS_PORT, "MPESA_STATUS_PORT"),
  };
}

function operationUrl(baseUrl: string, port: string, path: string): URL {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") throw new Error("M-Pesa API must use HTTPS.");
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("M-Pesa operation port is invalid.");
  }
  url.port = port;
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url;
}

async function send<T>(
  config: MpesaConfig,
  url: URL,
  method: "GET" | "POST",
  payload?: Record<string, string>,
): Promise<T> {
  const token = createMpesaBearerToken(config.apiKey, config.publicKey);
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Origin: config.origin,
    Accept: "application/json",
  });

  if (method === "GET" && payload) {
    for (const [key, value] of Object.entries(payload)) url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(method === "POST" && payload ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // Do not log credentials, request bodies, or provider responses.
    throw new MpesaApiError(
      error instanceof Error && error.name === "TimeoutError"
        ? "M-Pesa request timed out; reconcile transaction status before retrying."
        : "M-Pesa service is temporarily unavailable.",
      0,
    );
  }

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (value && typeof value === "object" && !Array.isArray(value)) {
      parsed = value as Record<string, unknown>;
    }
  } catch {
    throw new MpesaApiError("M-Pesa returned an invalid response.", response.status);
  }

  const responseCode = typeof parsed.output_ResponseCode === "string"
    ? parsed.output_ResponseCode
    : undefined;
  const responseDescription = typeof parsed.output_ResponseDesc === "string"
    ? parsed.output_ResponseDesc
    : undefined;

  if (!response.ok) {
    throw new MpesaApiError(
      responseDescription || "M-Pesa rejected the request.",
      response.status,
      responseCode,
      responseDescription,
    );
  }

  return parsed as T;
}

function validateC2BInput(input: MpesaC2BInput): Record<string, string> {
  const values = {
    input_TransactionReference: input.transactionReference.trim(),
    input_CustomerMSISDN: input.customerMsisdn.trim(),
    input_Amount: input.amount.trim(),
    input_ThirdPartyReference: input.thirdPartyReference.trim(),
    input_ServiceProviderCode: input.serviceProviderCode.trim(),
  };

  if (Object.values(values).some((value) => !value)) {
    throw new Error("All M-Pesa C2B parameters are required.");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(values.input_Amount) || Number(values.input_Amount) <= 0) {
    throw new Error("M-Pesa amount must be a positive value with up to two decimals.");
  }
  if (values.input_ThirdPartyReference.length > 20) {
    throw new Error("M-Pesa ThirdPartyReference must not exceed 20 characters.");
  }
  return values;
}

export function createMpesaClient(config = getMpesaConfigFromEnv()) {
  return {
    initiateC2B(input: MpesaC2BInput) {
      const url = operationUrl(config.baseUrl, config.c2bPort, C2B_PATH);
      return send<MpesaC2BResponse>(config, url, "POST", validateC2BInput(input));
    },

    queryTransactionStatus(input: MpesaStatusInput) {
      const values = {
        input_ThirdPartyReference: input.thirdPartyReference.trim(),
        input_QueryReference: input.queryReference.trim(),
        input_ServiceProviderCode: input.serviceProviderCode.trim(),
      };
      if (Object.values(values).some((value) => !value)) {
        throw new Error("All M-Pesa transaction-status parameters are required.");
      }
      const url = operationUrl(config.baseUrl, config.statusPort, STATUS_PATH);
      return send<MpesaStatusResponse>(config, url, "GET", values);
    },
  };
}
