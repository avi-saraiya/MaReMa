import { execSync } from "node:child_process";

// Create/upgrade the test database from migrations once per run; tests clear their own tables in beforeEach.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
