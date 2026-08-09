export const REQUEST_CATEGORIES = ["plumbing", "electrical", "heating", "appliance", "access", "other"] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const URGENCIES = ["low", "normal", "high", "urgent"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const REQUEST_STATUSES = ["new", "triaged", "scheduled", "in_progress", "blocked", "done", "acknowledged", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type Role = "landlord" | "tenant";
export type EventKind = "created" | "status_changed" | "assigned" | "visit_scheduled" | "note_added" | "acknowledged" | "reopened" | "escalated" | "closed";
export type EventVisibility = "tenant" | "internal";

export interface AttachmentMetadata {
  name: string;
  type: string;
  size: number;
}

export interface RequestEvent {
  id: string;
  kind: EventKind;
  actorName: string;
  createdAt: string;
  detail: string;
  visibility: EventVisibility;
}

export interface Unit {
  id: string;
  label: string;
  address: string;
  tenantName: string;
}

export interface Actor {
  id: string;
  name: string;
  role: Role;
  memberUnitIds: string[];
}

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  title: string;
  description: string;
  category: RequestCategory;
  urgency: Urgency;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  visitDate?: string;
  attachment?: AttachmentMetadata;
  events: RequestEvent[];
  version: number;
  assignedTo?: string;
  slaDueAt?: string;
  escalationLevel: number;
  acknowledgedAt?: string;
  closedAt?: string;
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  triaged: "Triaged",
  scheduled: "Scheduled",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  acknowledged: "Acknowledged",
  closed: "Closed",
};

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating: "Heating",
  appliance: "Appliance",
  access: "Access",
  other: "Other",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: ["triaged", "scheduled", "in_progress", "blocked"],
  triaged: ["scheduled", "in_progress", "blocked", "new"],
  scheduled: ["in_progress", "blocked", "triaged"],
  in_progress: ["done", "scheduled", "blocked"],
  blocked: ["triaged", "in_progress"],
  done: ["acknowledged", "in_progress"],
  acknowledged: ["closed", "in_progress"],
  closed: ["in_progress"],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertLandlordTransition(from: RequestStatus, to: RequestStatus): void {
  if (!REQUEST_STATUSES.includes(to) || !canTransition(from, to)) {
    throw new Error(`Invalid status transition from ${from} to ${to}.`);
  }
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
