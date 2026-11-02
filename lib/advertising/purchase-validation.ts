const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function parseMaputoCampaignStart(value: string, now = new Date()): string | null {
  const input = value.trim();
  if (!input) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
  const parsed = new Date(hasTimezone ? input : input + "+02:00");
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() < now.getTime()) return null;
  return parsed.toISOString();
}

export function normalizeCampaignTargets(values: readonly unknown[], maxItems = 10): string[] | null {
  if (values.length > maxItems) return null;
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") return null;
    const item = value.trim();
    if (!item || item.length > 120) return null;
    if (!normalized.includes(item)) normalized.push(item);
  }
  return normalized;
}

export function calculateCampaignPrice(
  basePrice: unknown,
  locations: readonly string[],
  categories: readonly string[],
): number | null {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base < 0) return null;
  const factor = 1 + (locations.length ? 0.1 : 0) + (categories.length ? 0.1 : 0);
  return Number((base * factor).toFixed(2));
}
