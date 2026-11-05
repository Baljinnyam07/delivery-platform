// Regenerates packages/shared/src/database.types.ts from the local database.
// Writes to a temp file first and replaces atomically, so a failed run (e.g.
// Supabase not started) never leaves an empty types file, and a running dev
// server never reads a half-written one.
import { execFileSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../packages/shared/src/database.types.ts", import.meta.url));
const tmp = `${target}.tmp`;

let output;
try {
  output = execFileSync("supabase", ["gen", "types", "typescript", "--local"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
  });
} catch {
  console.error("✗ supabase gen types failed — is the local stack running? (pnpm db:start)");
  process.exit(1);
}

if (!output.includes("export type Database") || !output.includes("export const Constants")) {
  console.error("✗ Unexpected generator output; database.types.ts left unchanged.");
  process.exit(1);
}

writeFileSync(tmp, output);
renameSync(tmp, target);
console.log("✓ packages/shared/src/database.types.ts updated");
