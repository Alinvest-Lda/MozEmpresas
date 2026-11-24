import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import {
  createMpesaBearerToken,
  createMpesaClient,
  type MpesaConfig,
} from "./mpesa-client";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const config: MpesaConfig = {
  apiKey: "A".repeat(32),
  publicKey: publicKey.toString("base64"),
  baseUrl: "https://api.sandbox.vm.co.mz",
  origin: "developer.mpesa.vm.co.mz",
  c2bPort: "18352",
  statusPort: "18353",
  timeoutMs: 2_000,
};

afterEach(() => vi.unstubAllGlobals());

describe("M-Pesa Open API client", () => {
  it("encrypts the API key as a Base64 RSA PKCS#1 v1.5 Bearer token", () => {
    const token = createMpesaBearerToken(config.apiKey, config.publicKey);
    const decrypted = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(token, "base64"),
    );
    expect(decrypted.toString("utf8")).toBe(config.apiKey);
  });

  it("sends C2B parameters to the configured port using HTTPS and Bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_ThirdPartyReference: "ME-ORDER-0001",
      output_ConversationID: "conversation-1",
      output_ResponseCode: "INS-0",
      output_ResponseDesc: "Request processed successfully",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createMpesaClient(config).initiateC2B({
      transactionReference: "SERVICE-ORDER-1",
      customerMsisdn: "258841234567",
      amount: "150.00",
      thirdPartyReference: "ME-ORDER-0001",
      serviceProviderCode: "902809",
    });

    expect(result.output_ResponseCode).toBe("INS-0");
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe("https://api.sandbox.vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toMatch(/^Bearer /);
    expect(JSON.parse(String(init.body))).toEqual({
      input_TransactionReference: "SERVICE-ORDER-1",
      input_CustomerMSISDN: "258841234567",
      input_Amount: "150.00",
      input_ThirdPartyReference: "ME-ORDER-0001",
      input_ServiceProviderCode: "902809",
    });
  });

  it("queries status with the three documented query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_ResponseCode: "INS-0",
      output_ResponseTransactionStatus: "Completed",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createMpesaClient(config).queryTransactionStatus({
      thirdPartyReference: "ME-ORDER-0001",
      queryReference: "conversation-1",
      serviceProviderCode: "902809",
    });

    expect(result.output_ResponseTransactionStatus).toBe("Completed");
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain(":18353/ipg/v1x/queryTransactionStatus/");
    expect(String(url)).toContain("input_ThirdPartyReference=ME-ORDER-0001");
    expect(String(url)).toContain("input_QueryReference=conversation-1");
    expect(String(url)).toContain("input_ServiceProviderCode=902809");
    expect(init.method).toBe("GET");
  });

  it("rejects insecure endpoints and invalid amount before sending", async () => {
    expect(() => createMpesaClient({ ...config, baseUrl: "http://api.vm.co.mz" })
      .initiateC2B({
        transactionReference: "order",
        customerMsisdn: "258841234567",
        amount: "0",
        thirdPartyReference: "ME-ORDER-0001",
        serviceProviderCode: "902809",
      })).toThrow();
  });
});
