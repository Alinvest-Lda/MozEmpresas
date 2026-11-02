import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";

export type ApiRequestContext = {
  requestId: string;
  route: string;
};

type ApiHandler = (request: Request, context: ApiRequestContext) => Promise<Response>;

function requestIdFrom(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim() ?? "";
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function withApiObservability(route: string, handler: ApiHandler) {
  return async (request: Request) => {
    const requestId = requestIdFrom(request);
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await handler(request, { requestId, route });
    } catch (error) {
      logger.error("api.request_unhandled", {
        request_id: requestId,
        route,
        method: request.method,
        error_name: error instanceof Error ? error.name : "UnknownError",
      });
      response = NextResponse.json(
        { error: "Não foi possível processar o pedido.", requestId },
        { status: 500 },
      );
    }

    response.headers.set("x-request-id", requestId);
    const context = {
      request_id: requestId,
      route,
      method: request.method,
      status: response.status,
      duration_ms: Math.max(0, Date.now() - startedAt),
    };
    if (response.status >= 500) logger.error("api.request_completed", context);
    else if (response.status >= 400) logger.warn("api.request_completed", context);
    else logger.info("api.request_completed", context);
    return response;
  };
}
