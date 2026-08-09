import { randomUUID } from "node:crypto";
import { assertLandlordTransition, type Actor, type EventVisibility, type MaintenanceRequest, type RequestEvent, type RequestStatus, type Role, type Unit, type Urgency } from "./domain";
import type { CreateRequestInput, UpdateRequestInput } from "./validation";

const units: Unit[] = [
  { id: "unit-cedar-2a", label: "Cedar House · 2A", address: "18 Cedar Lane, Portland", tenantName: "Jamie Rivera" },
  { id: "unit-corner-1b", label: "Corner Flat · 1B", address: "42 Alcott Street, Portland", tenantName: "Noah Williams" },
];

const landlord: Actor = { id: "landlord-morgan", name: "Morgan Lee", role: "landlord", memberUnitIds: units.map((unit) => unit.id) };
const tenants: Actor[] = [
  { id: "tenant-jamie", name: "Jamie Rivera", role: "tenant", memberUnitIds: ["unit-cedar-2a"] },
  { id: "tenant-noah", name: "Noah Williams", role: "tenant", memberUnitIds: ["unit-corner-1b"] },
];

const now = Date.now();
const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
const event = (kind: RequestEvent["kind"], actorName: string, createdAt: string, detail: string, visibility: EventVisibility = "tenant"): RequestEvent => ({ id: randomUUID(), kind, actorName, createdAt, detail, visibility });

function seedRequests(): MaintenanceRequest[] {
  return [
  {
    id: "request-drip",
    unitId: "unit-cedar-2a",
    title: "Kitchen tap is dripping overnight",
    description: "The cold-water tap has started dripping constantly. It is manageable during the day but keeps me awake at night.",
    category: "plumbing",
    urgency: "normal",
    status: "scheduled",
    createdAt: iso(420),
    updatedAt: iso(40),
    visitDate: new Date(now + 24 * 60 * 60_000).toISOString(),
    events: [
      event("created", "Jamie Rivera", iso(420), "Reported a plumbing issue."),
      event("status_changed", "Morgan Lee", iso(110), "Moved request from New to Scheduled."),
      event("visit_scheduled", "Morgan Lee", iso(40), "Visit planned for tomorrow afternoon."),
    ],
    version: 3,
    escalationLevel: 0,
  },
  {
    id: "request-boiler",
    unitId: "unit-corner-1b",
    title: "Bedroom radiator not warming up",
    description: "The radiator in the back bedroom stays cold while the rest of the flat is warm.",
    category: "heating",
    urgency: "high",
    status: "in_progress",
    createdAt: iso(1_320),
    updatedAt: iso(160),
    events: [
      event("created", "Noah Williams", iso(1_320), "Reported a heating issue."),
      event("status_changed", "Morgan Lee", iso(700), "Moved request from New to In progress."),
      event("note_added", "Morgan Lee", iso(160), "Parts ordered; checking the valve next.", "internal"),
    ],
    version: 3,
    assignedTo: "Morgan Lee",
    slaDueAt: new Date(now - 120 * 60_000).toISOString(),
    escalationLevel: 1,
  },
  {
    id: "request-lock",
    unitId: "unit-cedar-2a",
    title: "Front door latch catches",
    description: "The latch catches unless the handle is lifted firmly. The door still locks, but it feels less reliable.",
    category: "access",
    urgency: "urgent",
    status: "done",
    createdAt: iso(3_600),
    updatedAt: iso(2_700),
    events: [
      event("created", "Jamie Rivera", iso(3_600), "Reported an access issue."),
      event("status_changed", "Morgan Lee", iso(3_250), "Moved request from New to In progress."),
      event("note_added", "Morgan Lee", iso(2_700), "Latch adjusted and tested twice."),
      event("status_changed", "Morgan Lee", iso(2_700), "Marked work as Done; waiting for tenant acknowledgement."),
    ],
    version: 4,
    escalationLevel: 0,
  },
] ;
}

let requests: MaintenanceRequest[] = seedRequests();

const sessions = new Map<string, Actor>();
const dedupe = new Map<string, MaintenanceRequest>();

export class StoreConflictError extends Error {
  constructor(message = "This request changed in another tab. Refresh before trying again.") { super(message); this.name = "StoreConflictError"; }
}

export interface RequestListOptions {
  q?: string;
  status?: RequestStatus;
  urgency?: Urgency;
  sort?: "updated" | "urgency" | "sla";
}

export function issueDemoSession(role: Role, actorId?: string): string {
  const actor = role === "landlord" ? landlord : tenants.find((item) => item.id === actorId) ?? tenants[0];
  const token = `demo-${role}-${randomUUID()}`;
  sessions.set(token, actor);
  return token;
}

export function getActorForSession(token: string): Actor | null {
  return sessions.get(token) ?? null;
}

export function getActorById(id: string): Actor | null {
  return [landlord, ...tenants].find((actor) => actor.id === id) ?? null;
}

export function getUnitsForActor(actor: Actor): Unit[] {
  return units.filter((unit) => actor.memberUnitIds.includes(unit.id));
}

function visibleCopy(request: MaintenanceRequest, actor: Actor): MaintenanceRequest {
  return { ...request, events: request.events.filter((item) => actor.role === "landlord" || item.visibility === "tenant") };
}

export function listRequests(actor: Actor, options: RequestListOptions = {}): MaintenanceRequest[] {
  const query = options.q?.trim().toLowerCase();
  const urgencyRank: Record<Urgency, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  const result = requests
    .filter((request) => actor.role === "landlord" || actor.memberUnitIds.includes(request.unitId))
    .filter((request) => !options.status || request.status === options.status)
    .filter((request) => !options.urgency || request.urgency === options.urgency)
    .filter((request) => !query || `${request.title} ${request.description} ${request.category} ${request.assignedTo ?? ""}`.toLowerCase().includes(query))
    .sort((a, b) => options.sort === "urgency" ? urgencyRank[b.urgency] - urgencyRank[a.urgency] : options.sort === "sla" ? new Date(a.slaDueAt ?? a.updatedAt).getTime() - new Date(b.slaDueAt ?? b.updatedAt).getTime() : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return result.map((request) => visibleCopy(request, actor));
}

export function getRequestForActor(id: string, actor: Actor): MaintenanceRequest | null {
  const request = requests.find((item) => item.id === id);
  return request && (actor.role === "landlord" || actor.memberUnitIds.includes(request.unitId)) ? visibleCopy(request, actor) : null;
}

function rawRequestForLandlord(id: string): MaintenanceRequest | null { return requests.find((item) => item.id === id) ?? null; }

export function getWorkloadSummary(actor: Actor) {
  const visible = requests.filter((request) => actor.role === "landlord" || actor.memberUnitIds.includes(request.unitId));
  const nowTime = Date.now();
  return {
    total: visible.length,
    open: visible.filter((request) => !["done", "acknowledged", "closed"].includes(request.status)).length,
    overdue: visible.filter((request) => request.slaDueAt && new Date(request.slaDueAt).getTime() < nowTime && !["done", "acknowledged", "closed"].includes(request.status)).length,
    urgent: visible.filter((request) => ["urgent", "high"].includes(request.urgency) && !["closed", "acknowledged"].includes(request.status)).length,
    byStatus: visible.reduce<Record<string, number>>((result, request) => { result[request.status] = (result[request.status] ?? 0) + 1; return result; }, {}),
  };
}

export function createRequest(actor: Actor, input: CreateRequestInput): MaintenanceRequest {
  if (actor.role !== "tenant" || !actor.memberUnitIds.includes(input.unitId)) throw new Error("You do not have access to this unit.");
  const dedupeKey = input.clientRequestId ? `${actor.id}:${input.clientRequestId}` : undefined;
  if (dedupeKey && dedupe.has(dedupeKey)) return dedupe.get(dedupeKey) as MaintenanceRequest;
  const requestInput = { unitId: input.unitId, title: input.title, description: input.description, category: input.category, urgency: input.urgency, attachment: input.attachment };
  const createdAt = new Date().toISOString();
  const created: MaintenanceRequest = {
    id: `request-${randomUUID()}`,
    ...requestInput,
    status: "new",
    createdAt,
    updatedAt: createdAt,
    version: 1,
    slaDueAt: new Date(Date.now() + (input.urgency === "urgent" ? 4 : input.urgency === "high" ? 24 : 72) * 60 * 60_000).toISOString(),
    escalationLevel: 0,
    events: [event("created", actor.name, createdAt, "Reported a maintenance issue.")],
  };
  requests = [created, ...requests];
  if (dedupeKey) dedupe.set(dedupeKey, created);
  return created;
}

export function updateRequest(actor: Actor, id: string, input: UpdateRequestInput): MaintenanceRequest {
  if (actor.role !== "landlord") throw new Error("Only a landlord can update request operations.");
  const request = getRequestForActor(id, actor);
  const raw = rawRequestForLandlord(id);
  if (!request || !raw) throw new Error("Request not found.");
  if (input.expectedVersion !== undefined && input.expectedVersion !== raw.version) throw new StoreConflictError();
  const updatedAt = new Date().toISOString();
  if (input.status && input.status !== request.status) {
    assertLandlordTransition(raw.status, input.status);
    raw.events.push(event("status_changed", actor.name, updatedAt, `Moved request from ${raw.status.replaceAll("_", " ")} to ${input.status.replaceAll("_", " ")}.`));
    raw.status = input.status;
    if (input.status === "closed") raw.closedAt = updatedAt;
  }
  if (input.visitDate) {
    raw.visitDate = input.visitDate;
    raw.events.push(event("visit_scheduled", actor.name, updatedAt, `Visit planned for ${new Date(input.visitDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`));
  }
  if (input.assignedTo && input.assignedTo !== raw.assignedTo) { raw.assignedTo = input.assignedTo; raw.events.push(event("assigned", actor.name, updatedAt, `Assigned to ${input.assignedTo}.`, "internal")); }
  if (input.note) raw.events.push(event("note_added", actor.name, updatedAt, input.note, input.noteVisibility ?? "tenant"));
  if (input.escalationReason) { raw.escalationLevel += 1; raw.events.push(event("escalated", actor.name, updatedAt, input.escalationReason, "internal")); }
  raw.updatedAt = updatedAt;
  raw.version += 1;
  return visibleCopy(raw, actor);
}

export function acknowledgeRequest(actor: Actor, id: string, expectedVersion?: number): MaintenanceRequest {
  if (actor.role !== "tenant") throw new Error("Only a tenant can acknowledge completed work.");
  const request = getRequestForActor(id, actor);
  const raw = rawRequestForLandlord(id);
  if (!request || !raw) throw new Error("Request not found.");
  if (expectedVersion !== undefined && expectedVersion !== raw.version) throw new StoreConflictError();
  if (raw.status !== "done") throw new Error("Only completed work can be acknowledged.");
  const updatedAt = new Date().toISOString();
  raw.status = "acknowledged";
  raw.acknowledgedAt = updatedAt;
  raw.updatedAt = updatedAt;
  raw.version += 1;
  raw.events.push(event("acknowledged", actor.name, updatedAt, "Confirmed the work is complete."));
  return visibleCopy(raw, actor);
}

export function reopenRequest(actor: Actor, id: string, reason: string): MaintenanceRequest {
  const raw = rawRequestForLandlord(id);
  if (!raw || (actor.role === "tenant" && !actor.memberUnitIds.includes(raw.unitId))) throw new Error("Request not found.");
  if (!["acknowledged", "closed", "done"].includes(raw.status)) throw new Error("Only completed work can be reopened.");
  const nowValue = new Date().toISOString();
  raw.status = "in_progress";
  raw.closedAt = undefined;
  raw.updatedAt = nowValue;
  raw.version += 1;
  raw.events.push(event("reopened", actor.name, nowValue, reason));
  return visibleCopy(raw, actor);
}

export function resetDemoData(): void { requests = seedRequests(); dedupe.clear(); }
