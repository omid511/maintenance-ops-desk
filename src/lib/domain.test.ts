import { describe, expect, it } from "vitest";
import { assertLandlordTransition, canTransition } from "./domain";
import { parseCreateRequest } from "./validation";
import { createRequest, getActorForSession, getRequestForActor, issueDemoSession, listRequests, resetDemoData, StoreConflictError, updateRequest } from "./store";

describe("maintenance request rules", () => {
  it("allows the operational path from new to acknowledged", () => {
    expect(canTransition("new", "scheduled")).toBe(true);
    expect(canTransition("scheduled", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "done")).toBe(true);
  });

  it("rejects skipping from new to done", () => {
    expect(() => assertLandlordTransition("new", "done")).toThrow("Invalid status transition");
  });

  it("requires bounded, image-only attachment metadata", () => {
    expect(() => parseCreateRequest({ unitId: "unit", title: "Tap", description: "Drips", category: "plumbing", urgency: "normal", attachment: { name: "notes.pdf", type: "application/pdf", size: 100 } })).toThrow("Only image attachment metadata");
    expect(parseCreateRequest({ unitId: "unit", title: "Tap", description: "Drips", category: "plumbing", urgency: "normal", attachment: { name: "tap.jpg", type: "image/jpeg", size: 100 } }).attachment?.type).toBe("image/jpeg");
  });
});

describe("server-side membership, visibility, dedupe, and races", () => {
  it("limits tenants to their memberships and hides internal notes", () => {
    resetDemoData();
    const noah = getActorForSession(issueDemoSession("tenant", "tenant-noah"));
    expect(noah).not.toBeNull();
    const requests = listRequests(noah!);
    expect(requests.every((item) => item.unitId === "unit-corner-1b")).toBe(true);
    expect(requests.some((item) => item.events.some((event) => event.visibility === "internal"))).toBe(false);
  });

  it("deduplicates a replayed tenant create", () => {
    resetDemoData();
    const tenant = getActorForSession(issueDemoSession("tenant"))!;
    const input = { unitId: "unit-cedar-2a", title: "Loose handle", description: "The handle wiggles.", category: "access" as const, urgency: "normal" as const, clientRequestId: "mobile-retry-1" };
    const first = createRequest(tenant, input);
    const replay = createRequest(tenant, input);
    expect(replay.id).toBe(first.id);
    expect(listRequests(tenant).filter((item) => item.id === first.id)).toHaveLength(1);
  });

  it("rejects stale operator writes instead of losing a concurrent update", () => {
    resetDemoData();
    const landlord = getActorForSession(issueDemoSession("landlord"))!;
    const current = getRequestForActor("request-boiler", landlord)!;
    updateRequest(landlord, current.id, { status: "done", expectedVersion: current.version });
    expect(() => updateRequest(landlord, current.id, { status: "closed", expectedVersion: current.version })).toThrow(StoreConflictError);
  });
});
