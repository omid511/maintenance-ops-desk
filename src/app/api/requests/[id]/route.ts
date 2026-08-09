import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth";
import { getRequestForActor, StoreConflictError, updateRequest } from "@/lib/store";
import { parseUpdateRequest } from "@/lib/validation";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Demo session required." }, { status: 401 });
  const { id } = await context.params;
  const item = getRequestForActor(id, actor);
  return item ? NextResponse.json({ request: item }) : NextResponse.json({ error: "Request not found." }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Demo session required." }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json({ request: updateRequest(actor, id, parseUpdateRequest(await request.json())) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update request.";
    return NextResponse.json({ error: message }, { status: message === "Request not found." ? 404 : error instanceof StoreConflictError ? 409 : 400 });
  }
}
