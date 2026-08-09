export type PersistenceMode = "demo" | "postgres";

export interface EnvironmentReport {
  mode: PersistenceMode;
  ready: boolean;
  issues: string[];
}

export function environmentReport(env: NodeJS.ProcessEnv = process.env): EnvironmentReport {
  const mode: PersistenceMode = env.MAINTENANCE_MODE === "postgres" ? "postgres" : "demo";
  const issues: string[] = [];
  if (mode === "postgres" && !env.DATABASE_URL) issues.push("DATABASE_URL is required when MAINTENANCE_MODE=postgres.");
  if ((env.MAINTENANCE_AUTH_MODE === "production" || mode === "postgres") && !env.MAINTENANCE_SESSION_SECRET) issues.push("MAINTENANCE_SESSION_SECRET is required when production auth is enabled.");
  return { mode, ready: issues.length === 0, issues };
}

export function assertEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentReport {
  const report = environmentReport(env);
  if (!report.ready) throw new Error(report.issues.join(" "));
  return report;
}
