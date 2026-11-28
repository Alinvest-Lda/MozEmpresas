const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9]{3}-[89ab][0-9]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function parseMaputoLocalDateTime(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
  const localInput = /^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input;
  const parsed = new Date(hasTimezone ? localInput : localInput + "+02:00");
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function parseMaputoCampaignStart(value: string, now = new Date()): string | null {
  const parsed = parseMaputoLocalDateTime(value);
  if (!parsed || new Date(parsed).getTime() < now.getTime()) return null;
  return parsed;
}

export function maputoDateTimeLocalInputValue(now = new Date()): string {
  const roundedNow = new Date(Math.ceil(now.getTime() / 60000) * 60000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Maputo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(roundedNow);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
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
  if (basePrice === null || basePrice === undefined || basePrice === "") return null;
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base < 0) return null;
  const factor = 1 + (locations.length ? 0.1 : 0) + (categories.length ? 0.1 : 0);
  return Number((base * factor).toFixed(2));
}
export function calculateCampaignCredits(
  baseCredits: unknown,
  locations: readonly string[],
  categories: readonly string[],
): number | null {
  if (baseCredits === null || baseCredits === undefined || baseCredits === "") return null;
  const base = Number(baseCredits);
  if (!Number.isFinite(base) || base < 0) return null;
  const factor = 1 + (locations.length ? 0.1 : 0) + (categories.length ? 0.1 : 0);
  return Math.ceil(Number((base * factor).toFixed(2)));
}
