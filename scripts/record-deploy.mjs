import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const VALID_TARGETS = ["backend", "storefront", "system", "cfsystem"];

const target = process.argv[2];

if (!VALID_TARGETS.includes(target)) {
  console.error(`Usage: node scripts/record-deploy.mjs <${VALID_TARGETS.join("|")}>`);
  process.exit(1);
}

try {
  const hash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const raw = readFileSync(packageJsonUrl, "utf8");
  const packageJson = JSON.parse(raw);
  packageJson.deployedAt = {
    ...(packageJson.deployedAt ?? {}),
    [target]: hash,
  };
  writeFileSync(packageJsonUrl, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Recorded deploy: ${target}=${hash}`);
} catch (error) {
  console.error(
    "Failed to record deploy:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
