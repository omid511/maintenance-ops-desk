import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth";
import { acknowledgeRequest, StoreConflictError } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Demo session required." }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { expectedVersion?: unknown };
    const expectedVersion = typeof body.expectedVersion === "number" ? body.expectedVersion : undefined;
    const { id } = await context.params;
    return NextResponse.json({ request: acknowledgeRequest(actor, id, expectedVersion) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not acknowledge request.";
    return NextResponse.json({ error: message }, { status: message === "Request not found." ? 404 : error instanceof StoreConflictError ? 409 : 400 });
  }
}
