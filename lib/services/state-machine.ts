export const serviceRequestTransitions = {
  REQUESTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["QUOTED", "ACCEPTED", "CANCELLED"],
  QUOTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export type ServiceRequestStatus = keyof typeof serviceRequestTransitions;

export function isServiceRequestStatus(value: string): value is ServiceRequestStatus {
  return Object.prototype.hasOwnProperty.call(serviceRequestTransitions, value);
}

export function canTransitionServiceRequest(from: string, to: string): to is ServiceRequestStatus {
  return isServiceRequestStatus(from)
    && isServiceRequestStatus(to)
    && (serviceRequestTransitions[from] as readonly string[]).includes(to);
}
