import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const isProd = process.argv.includes("--prod");
const envFile = isProd ? ".env.prod" : ".env.local";
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(rootDir, envFile);

if (!fs.existsSync(envPath)) {
  console.error(`${envFile} not found`);
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf8");
const lines = content.split("\n");

lines.forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [left, ...rightParts] = trimmed.split("=");
    if (left && rightParts.length > 0) {
      const key = left.trim();
      const value = rightParts.join("=").trim();
      const args = [
        "--filter",
        "@dg/backend",
        "convex:env",
        ...(isProd ? ["--prod"] : []),
        "set",
        key,
        value,
      ];
      console.log(
        `Setting ${key} on the ${isProd ? "production" : "development"} deployment`,
      );
      const result = spawnSync("pnpm", args, {
        cwd: rootDir,
        stdio: "inherit",
      });
      if (result.status !== 0) {
        console.error(`Failed to set ${key}`);
      }
    }
  }
});
