import { NextResponse } from "next/server";
import { actorFromRequest } from "@/lib/auth";
import { REQUEST_STATUSES, URGENCIES, type RequestStatus, type Urgency } from "@/lib/domain";
import { createRequest, getUnitsForActor, getWorkloadSummary, listRequests } from "@/lib/store";
import { parseCreateRequest } from "@/lib/validation";

export async function GET(request: Request) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Demo session required." }, { status: 401 });
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  const rawUrgency = url.searchParams.get("urgency");
  const status = REQUEST_STATUSES.includes(rawStatus as RequestStatus) ? rawStatus as RequestStatus : undefined;
  const urgency = URGENCIES.includes(rawUrgency as Urgency) ? rawUrgency as Urgency : undefined;
  const rawSort = url.searchParams.get("sort");
  const sort = rawSort === "urgency" || rawSort === "sla" ? rawSort : "updated";
  return NextResponse.json({ actor, units: getUnitsForActor(actor), requests: listRequests(actor, { q: url.searchParams.get("q") ?? undefined, status, urgency, sort }), summary: getWorkloadSummary(actor) });
}

export async function POST(request: Request) {
  const actor = actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Demo session required." }, { status: 401 });
  try {
    const created = createRequest(actor, parseCreateRequest(await request.json()));
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create request." }, { status: 400 });
  }
}
