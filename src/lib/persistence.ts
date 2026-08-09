import type { MaintenanceRequest, RequestEvent, RequestStatus, Urgency } from "./domain";

export interface SqlClient {
  query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
}

export interface RequestQuery {
  unitIds: readonly string[];
  search?: string;
  status?: RequestStatus;
  urgency?: Urgency;
}

export interface DurableMaintenanceAdapter {
  readonly mode: "postgres";
  health(): Promise<boolean>;
  listRequests(query: RequestQuery): Promise<MaintenanceRequest[]>;
  appendEvent(requestId: string, event: RequestEvent, expectedVersion: number): Promise<void>;
}

/**
 * Provider-neutral Postgres boundary. The app's default adapter is the seeded
 * in-memory store; a pg Pool or Supabase server client can satisfy SqlClient
 * without leaking database details into route handlers.
 */
export function createPostgresAdapter(client: SqlClient): DurableMaintenanceAdapter {
  return {
    mode: "postgres",
    async health() {
      await client.query("select 1 as ok");
      return true;
    },
    async listRequests(query) {
      if (query.unitIds.length === 0) return [];
      const values: unknown[] = [query.unitIds];
      const filters = ["r.unit_id = any($1::text[])"];
      if (query.status) { values.push(query.status); filters.push(`r.status = $${values.length}`); }
      if (query.urgency) { values.push(query.urgency); filters.push(`r.urgency = $${values.length}`); }
      if (query.search) { values.push(`%${query.search}%`); filters.push(`(r.title ilike $${values.length} or r.description ilike $${values.length})`); }
      const result = await client.query<MaintenanceRequest>(`select r.* from maintenance_requests r where ${filters.join(" and ")} order by r.updated_at desc`, values);
      return result.rows;
    },
    async appendEvent(requestId, event, expectedVersion) {
      const updated = await client.query("update maintenance_requests set version = version + 1, updated_at = $2 where id = $1 and version = $3 returning version", [requestId, event.createdAt, expectedVersion]);
      if (updated.rows.length !== 1) throw new Error("Concurrent request update rejected; refresh and retry.");
      await client.query("insert into request_events (id, request_id, kind, actor_name, detail, visibility, created_at) values ($1,$2,$3,$4,$5,$6,$7)", [event.id, requestId, event.kind, event.actorName, event.detail, event.visibility, event.createdAt]);
    },
  };
}
