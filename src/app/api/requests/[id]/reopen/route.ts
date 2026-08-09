import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth";
import { reopenRequest } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Verified session required." }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
    if (typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.length > 300) return NextResponse.json({ error: "A reopen reason between 5 and 300 characters is required." }, { status: 400 });
    const { id } = await context.params;
    return NextResponse.json({ request: reopenRequest(actor, id, body.reason.trim()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reopen request.";
    return NextResponse.json({ error: message }, { status: message === "Request not found." ? 404 : 400 });
  }
}
