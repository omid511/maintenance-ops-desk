import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor, Role } from "./domain";
import { environmentReport } from "./config";
import { getActorById, getActorForSession, issueDemoSession } from "./store";

export function createDemoSession(role: Role): { token: string; actor: Actor } {
  const token = issueDemoSession(role);
  const actor = getActorForSession(token);
  if (!actor) throw new Error("Could not create demo session.");
  return { token, actor };
}

export function actorFromRequest(request: Request): Actor | null {
  const cookie = request.headers.get("cookie") ?? "";
  const demoToken = cookie.match(/(?:^|;\s*)demo_session=([^;]+)/)?.[1];
  if (demoToken) return getActorForSession(demoToken);
  const signedToken = cookie.match(/(?:^|;\s*)maintenance_session=([^;]+)/)?.[1];
  return signedToken ? verifyProductionSession(signedToken) : null;
}

function secret(): string | null { return process.env.MAINTENANCE_SESSION_SECRET ?? null; }

export function issueProductionSession(actorId: string): string {
  const sessionSecret = secret();
  if (!sessionSecret || !getActorById(actorId)) throw new Error("Production session signing is not configured.");
  const payload = Buffer.from(JSON.stringify({ actorId, exp: Date.now() + 8 * 60 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyProductionSession(value: string): Actor | null {
  const sessionSecret = secret();
  if (!sessionSecret) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { actorId?: string; exp?: number };
    return parsed.exp && parsed.exp > Date.now() && parsed.actorId ? getActorById(parsed.actorId) : null;
  } catch { return null; }
}

export function authMode(): "demo" | "production" { return environmentReport().mode === "postgres" || process.env.MAINTENANCE_AUTH_MODE === "production" ? "production" : "demo"; }
