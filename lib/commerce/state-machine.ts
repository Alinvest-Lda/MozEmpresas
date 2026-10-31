export const commerceOrderTransitions: Record<string, readonly string[]> = {
  INTERESTED: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["NEGOTIATING", "CANCELLED"],
  NEGOTIATING: ["AGREED", "CANCELLED"],
  AGREED: ["COMPLETED", "CANCELLED"],
};

export function canTransitionCommerceOrder(from: string, to: string): boolean {
  return commerceOrderTransitions[from]?.includes(to) ?? false;
}

export function isCommerceOrderStatus(value: string): boolean {
  return value === "INTERESTED" || value === "CONTACTED" || value === "NEGOTIATING" ||
    value === "AGREED" || value === "COMPLETED" || value === "CANCELLED";
}

export const listingTransitions: Record<string, readonly string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["PAUSED", "SOLD_OUT", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "SOLD_OUT", "ARCHIVED"],
  SOLD_OUT: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionListing(from: string, to: string): boolean {
  return listingTransitions[from]?.includes(to) ?? false;
}
