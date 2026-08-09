import { describe, expect, it } from "vitest";
import { environmentReport } from "./config";

describe("environment contract", () => {
  it("keeps a secret-free demo deployment ready", () => {
    expect(environmentReport({ NODE_ENV: "test", MAINTENANCE_MODE: "demo" }).ready).toBe(true);
  });

  it("requires persistence and signing configuration for production mode", () => {
    const report = environmentReport({ NODE_ENV: "test", MAINTENANCE_MODE: "postgres", MAINTENANCE_AUTH_MODE: "production" });
    expect(report.ready).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([expect.stringContaining("DATABASE_URL"), expect.stringContaining("MAINTENANCE_SESSION_SECRET")]));
  });
});
