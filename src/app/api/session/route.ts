import { NextResponse } from "next/server";
import { authMode, createDemoSession } from "@/lib/auth";
import type { Role } from "@/lib/domain";

export async function POST(request: Request) {
  if (authMode() === "production") return NextResponse.json({ error: "Production auth is enabled; use the verified maintenance_session cookie." }, { status: 401 });
  try {
    const body = (await request.json()) as { role?: Role };
    if (body.role !== "landlord" && body.role !== "tenant") return NextResponse.json({ error: "Role is invalid." }, { status: 400 });
    const { token, actor } = createDemoSession(body.role);
    const response = NextResponse.json({ actor });
    response.cookies.set("demo_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not start demo mode." }, { status: 500 });
  }
}
