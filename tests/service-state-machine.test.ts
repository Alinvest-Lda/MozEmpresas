import { describe, expect, it } from "vitest";
import {
  canTransitionServiceRequest,
  isServiceRequestStatus,
  serviceRequestTransitions,
} from "../lib/services/state-machine";

describe("platform service request state machine", () => {
  it("allows the defined operational progression", () => {
    expect(canTransitionServiceRequest("REQUESTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionServiceRequest("UNDER_REVIEW", "QUOTED")).toBe(true);
    expect(canTransitionServiceRequest("UNDER_REVIEW", "ACCEPTED")).toBe(true);
    expect(canTransitionServiceRequest("QUOTED", "ACCEPTED")).toBe(true);
    expect(canTransitionServiceRequest("ACCEPTED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionServiceRequest("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("allows cancellation before completion only", () => {
    for (const status of ["REQUESTED", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "IN_PROGRESS"]) {
      expect(canTransitionServiceRequest(status, "CANCELLED")).toBe(true);
    }
    expect(canTransitionServiceRequest("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionServiceRequest("CANCELLED", "CANCELLED")).toBe(false);
  });

  it("rejects skipped, reverse, repeated and unknown transitions", () => {
    expect(canTransitionServiceRequest("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransitionServiceRequest("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionServiceRequest("QUOTED", "UNDER_REVIEW")).toBe(false);
    expect(canTransitionServiceRequest("REQUESTED", "REQUESTED")).toBe(false);
    expect(canTransitionServiceRequest("UNKNOWN", "COMPLETED")).toBe(false);
    expect(canTransitionServiceRequest("REQUESTED", "UNKNOWN")).toBe(false);
  });

  it("matches the supported database status vocabulary", () => {
    for (const status of Object.keys(serviceRequestTransitions)) {
      expect(isServiceRequestStatus(status)).toBe(true);
    }
    expect(isServiceRequestStatus("PAID")).toBe(false);
    expect(isServiceRequestStatus("")).toBe(false);
  });

  it("does not configure self-transitions", () => {
    for (const [from, targets] of Object.entries(serviceRequestTransitions)) {
      expect(targets).not.toContain(from);
    }
  });
});
