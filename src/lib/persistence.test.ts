import { describe, expect, it, vi } from "vitest";
import { createPostgresAdapter } from "./persistence";

describe("Postgres persistence boundary", () => {
  it("uses parameterized queue queries and optimistic event writes", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ version: 2 }] })
      .mockResolvedValueOnce({ rows: [] });
    const adapter = createPostgresAdapter({ query });
    expect(await adapter.health()).toBe(true);
    expect(await adapter.listRequests({ unitIds: ["unit-cedar-2a"], search: "tap" })).toEqual([]);
    await adapter.appendEvent("request-1", { id: "event-1", kind: "note_added", actorName: "Morgan", createdAt: "2026-01-01T00:00:00.000Z", detail: "Checked", visibility: "internal" }, 1);
    expect(query.mock.calls[1][1]).toEqual([["unit-cedar-2a"], "%tap%"]);
    expect(query.mock.calls[2][0]).toContain("where id = $1 and version = $3");
  });
});
