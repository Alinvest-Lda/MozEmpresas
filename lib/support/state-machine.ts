export const supportTicketTransitions: Record<string, readonly string[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: [],
};

export function isSupportTicketStatus(status: unknown): status is keyof typeof supportTicketTransitions {
  return typeof status === "string" && Object.prototype.hasOwnProperty.call(supportTicketTransitions, status);
}

export function canTransitionSupportTicket(from: unknown, to: unknown): boolean {
  return isSupportTicketStatus(from) && typeof to === "string" && supportTicketTransitions[from].includes(to);
}

export function getSupportTicketTransitions(status: unknown): string[] {
  return isSupportTicketStatus(status) ? [...supportTicketTransitions[status]] : [];
}
