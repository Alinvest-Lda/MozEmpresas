export const opportunityTransitions: Record<string, readonly string[]> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["CLOSED", "ARCHIVED"],
  CLOSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionOpportunity(from: string, to: string): boolean {
  return opportunityTransitions[from]?.includes(to) ?? false;
}

export const partnerApplicationTransitions: Record<string, readonly string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "ACCEPTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "ACCEPTED", "REJECTED"],
  SHORTLISTED: ["ACCEPTED", "REJECTED"],
};

export function canTransitionPartnerApplication(from: string, to: string): boolean {
  return partnerApplicationTransitions[from]?.includes(to) ?? false;
}
