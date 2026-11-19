import { describe, expect, it } from "vitest";
import { canTransitionSupportTicket, getSupportTicketTransitions, isSupportTicketStatus, supportTicketTransitions } from "../lib/support/state-machine";

describe("support ticket state machine", () => {
  it("allows the defined support workflow", () => {
    expect(canTransitionSupportTicket("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionSupportTicket("IN_PROGRESS", "WAITING_USER")).toBe(true);
    expect(canTransitionSupportTicket("WAITING_USER", "IN_PROGRESS")).toBe(true);
    expect(canTransitionSupportTicket("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransitionSupportTicket("RESOLVED", "OPEN")).toBe(true);
    expect(canTransitionSupportTicket("RESOLVED", "CLOSED")).toBe(true);
  });
  it("keeps CLOSED terminal and rejects invalid transitions", () => {
    expect(getSupportTicketTransitions("CLOSED")).toEqual([]);
    expect(canTransitionSupportTicket("CLOSED", "OPEN")).toBe(false);
    expect(canTransitionSupportTicket("OPEN", "CLOSED")).toBe(true);
    expect(canTransitionSupportTicket("OPEN", "OPEN")).toBe(false);
    expect(canTransitionSupportTicket("UNKNOWN", "OPEN")).toBe(false);
    expect(canTransitionSupportTicket("OPEN", "UNKNOWN")).toBe(false);
  });
  it("matches the database status vocabulary", () => {
    for (const status of Object.keys(supportTicketTransitions)) expect(isSupportTicketStatus(status)).toBe(true);
    expect(isSupportTicketStatus("PENDING")).toBe(false);
    expect(isSupportTicketStatus("")).toBe(false);
    expect(isSupportTicketStatus(null)).toBe(false);
  });
});
