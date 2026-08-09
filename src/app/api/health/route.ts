import { NextResponse } from "next/server";
import { environmentReport } from "@/lib/config";

export function GET() {
  const report = environmentReport();
  return NextResponse.json({ ok: report.ready, persistence: report.mode, auth: report.mode === "demo" ? "demo-session" : "signed-session", issues: report.issues }, { status: report.ready ? 200 : 503 });
}
