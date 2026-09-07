import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VALID_TARGETS = ["backend", "storefront", "system", "cfsystem"];

const DEPLOY_COMMANDS = {
  backend: "pnpm --filter @dg/backend run deploy",
  cfsystem: "pnpm --filter @dg/cfsystem-redirect run deploy",
  storefront: "pnpm --filter @dg/storefront run deploy",
  system: "pnpm --filter @dg/system run deploy",
};

const target = process.argv[2];

if (!VALID_TARGETS.includes(target)) {
  console.error(`Usage: node scripts/deploy.mjs <${VALID_TARGETS.join("|")}>`);
  process.exit(1);
}

const rootDir = fileURLToPath(new URL("../", import.meta.url));

try {
  const hash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8"));
  if (packageJson.deployedAt?.[target] === hash) {
    console.log(`Skipping deploy: ${target} already deployed at ${hash}`);
    process.exit(0);
  }
  execSync(DEPLOY_COMMANDS[target], { cwd: rootDir, stdio: "inherit" });
  execSync(`node scripts/record-deploy.mjs ${target}`, {
    cwd: rootDir,
    stdio: "inherit",
  });
} catch (error) {
  console.error(
    `Deploy failed: ${target}`,
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
