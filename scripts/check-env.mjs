const mode = process.env.MAINTENANCE_MODE ?? "demo";
const auth = process.env.MAINTENANCE_AUTH_MODE ?? (mode === "postgres" ? "production" : "demo");
const issues = [];

if (!['demo', 'postgres'].includes(mode)) issues.push('MAINTENANCE_MODE must be demo or postgres.');
if (!['demo', 'production'].includes(auth)) issues.push('MAINTENANCE_AUTH_MODE must be demo or production.');
if (mode === 'postgres' && !process.env.DATABASE_URL) issues.push('DATABASE_URL is required for postgres mode.');
if (auth === 'production' && !process.env.MAINTENANCE_SESSION_SECRET) issues.push('MAINTENANCE_SESSION_SECRET is required for production auth.');

if (issues.length) {
  console.error(issues.join('\n'));
  process.exit(1);
}
console.log(`Configuration valid: persistence=${mode}, auth=${auth}`);
