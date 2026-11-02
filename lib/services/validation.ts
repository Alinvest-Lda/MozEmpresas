import { z } from "zod";

export const serviceRequestStatuses = [
  "REQUESTED",
  "UNDER_REVIEW",
  "QUOTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export const serviceRequestInputSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export const serviceRequestUpdateInputSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(serviceRequestStatuses),
  requestedPrice: z.number().finite().nonnegative().nullable(),
});

export function parseServiceRequestInput(input: unknown) {
  return serviceRequestInputSchema.safeParse(input);
}

export function parseServiceRequestUpdateInput(input: {
  requestId: unknown;
  status: unknown;
  requestedPrice: unknown;
}) {
  const rawPrice = typeof input.requestedPrice === "string" ? input.requestedPrice.trim() : "";
  const price = rawPrice ? Number(rawPrice.replace(",", ".")) : null;

  if (rawPrice && (!Number.isFinite(price) || price === null || price < 0)) {
    return { success: false as const, error: "INVALID_PRICE" as const };
  }

  const parsed = serviceRequestUpdateInputSchema.safeParse({
    requestId: input.requestId,
    status: typeof input.status === "string" ? input.status.toUpperCase() : input.status,
    requestedPrice: price,
  });

  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: "INVALID_INPUT" as const };
}
