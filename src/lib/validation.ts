import { REQUEST_CATEGORIES, REQUEST_STATUSES, URGENCIES, type AttachmentMetadata, type RequestCategory, type RequestStatus, type Urgency } from "./domain";

export interface CreateRequestInput {
  unitId: string;
  title: string;
  description: string;
  category: RequestCategory;
  urgency: Urgency;
  attachment?: AttachmentMetadata;
  clientRequestId?: string;
}

export interface UpdateRequestInput {
  status?: RequestStatus;
  visitDate?: string;
  note?: string;
  noteVisibility?: "tenant" | "internal";
  assignedTo?: string;
  expectedVersion?: number;
  escalationReason?: string;
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > max) {
    throw new Error(`${field} is required and must be ${max} characters or fewer.`);
  }
  return value.trim();
}

function oneOf<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new Error(`${field} is invalid.`);
  return value as T;
}

function attachment(value: unknown): AttachmentMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw new Error("Attachment metadata is invalid.");
  const item = value as Record<string, unknown>;
  const name = text(item.name, "Attachment name", 120);
  const type = text(item.type, "Attachment type", 80);
  const size = item.size;
  if (!Number.isInteger(size) || (size as number) < 1 || (size as number) > 10_000_000) throw new Error("Attachment size must be between 1 byte and 10 MB.");
  if (!type.startsWith("image/")) throw new Error("Only image attachment metadata is accepted.");
  return { name, type, size: size as number };
}

export function parseCreateRequest(value: unknown): CreateRequestInput {
  if (!value || typeof value !== "object") throw new Error("Request body is invalid.");
  const input = value as Record<string, unknown>;
  return {
    unitId: text(input.unitId, "Unit", 80),
    title: text(input.title, "Summary", 100),
    description: text(input.description, "Description", 2000),
    category: oneOf(input.category, "Category", REQUEST_CATEGORIES),
    urgency: oneOf(input.urgency, "Urgency", URGENCIES),
    attachment: attachment(input.attachment),
    clientRequestId: input.clientRequestId === undefined ? undefined : text(input.clientRequestId, "Client request id", 100),
  };
}

export function parseUpdateRequest(value: unknown): UpdateRequestInput {
  if (!value || typeof value !== "object") throw new Error("Request body is invalid.");
  const input = value as Record<string, unknown>;
  const result: UpdateRequestInput = {};
  if (input.status !== undefined) result.status = oneOf(input.status, "Status", REQUEST_STATUSES);
  if (input.visitDate !== undefined) {
    if (typeof input.visitDate !== "string" || Number.isNaN(Date.parse(input.visitDate))) throw new Error("Visit date is invalid.");
    result.visitDate = input.visitDate;
  }
  if (input.note !== undefined) result.note = text(input.note, "Note", 500);
  if (input.noteVisibility !== undefined) result.noteVisibility = oneOf(input.noteVisibility, "Note visibility", ["tenant", "internal"] as const);
  if (input.assignedTo !== undefined) result.assignedTo = text(input.assignedTo, "Assignee", 100);
  if (input.expectedVersion !== undefined) {
    if (!Number.isInteger(input.expectedVersion) || (input.expectedVersion as number) < 1) throw new Error("Expected version is invalid.");
    result.expectedVersion = input.expectedVersion as number;
  }
  if (input.escalationReason !== undefined) result.escalationReason = text(input.escalationReason, "Escalation reason", 300);
  if (!result.status && !result.visitDate && !result.note && !result.assignedTo && !result.escalationReason) throw new Error("Add a status, visit date, note, assignee, or escalation reason.");
  return result;
}
