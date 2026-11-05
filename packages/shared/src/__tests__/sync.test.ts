// Guards against drift between the database (source of truth) and
// the hand-maintained lists in this package.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES } from "../enums";
import { RPC_ERROR_CODES, getErrorMessage, getRpcErrorCode } from "../errors";

const migrationsDir = fileURLToPath(new URL("../../../../supabase/migrations", import.meta.url));
const sql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n");

describe("errors ↔ migrations", () => {
  const raised = new Set<string>();
  for (const m of sql.matchAll(/raise exception '([A-Z_]+)'/g)) raised.add(m[1]!);
  for (const m of sql.matchAll(/raise_delivery_state_error\([^,]+,\s*'([A-Z_]+)'\)/g)) raised.add(m[1]!);

  it("finds error codes in migrations", () => {
    expect(raised.size).toBeGreaterThan(10);
  });

  it("every code raised by the DB has a Mongolian message", () => {
    const missing = [...raised].filter((c) => !RPC_ERROR_CODES.includes(c as never));
    expect(missing).toEqual([]);
  });

  it("no stale codes in the message map", () => {
    const stale = RPC_ERROR_CODES.filter((c) => !raised.has(c));
    expect(stale).toEqual([]);
  });
});

describe("notification types ↔ migrations", () => {
  it("matches the CHECK constraint", () => {
    const block = sql.match(/type\s+text not null check \(type in \(([\s\S]*?)\)\)/)?.[1] ?? "";
    const dbTypes = [...block.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(dbTypes.sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });
});

describe("error mapping", () => {
  it("maps our RPC codes", () => {
    const err = { code: "P0001", message: "DELIVERY_NOT_AVAILABLE" };
    expect(getRpcErrorCode(err)).toBe("DELIVERY_NOT_AVAILABLE");
    expect(getErrorMessage(err)).toBe("Энэ хүргэлтийг өөр курьер авсан байна.");
  });

  it("maps permission errors to NOT_AUTHORIZED", () => {
    expect(getRpcErrorCode({ code: "42501", message: "permission denied for table deliveries" })).toBe(
      "NOT_AUTHORIZED",
    );
  });

  it("falls back to a generic message", () => {
    expect(getRpcErrorCode({ code: "08006", message: "connection failure" })).toBeNull();
    expect(getErrorMessage(null)).toBe("Алдаа гарлаа. Дахин оролдоно уу.");
  });
});
