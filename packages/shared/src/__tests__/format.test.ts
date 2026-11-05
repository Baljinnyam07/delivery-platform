import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMNT,
  formatPhone,
  formatTime,
  todayInUlaanbaatar,
} from "../format";

describe("formatMNT", () => {
  it.each([
    [0, "0₮"],
    [500, "500₮"],
    [25000, "25,000₮"],
    [1234567, "1,234,567₮"],
    ["120000.00", "120,000₮"],
    [null, "0₮"],
  ])("%s → %s", (input, expected) => {
    expect(formatMNT(input)).toBe(expected);
  });
});

describe("Ulaanbaatar time (UTC+8)", () => {
  it("formats in local business time", () => {
    expect(formatDateTime("2026-11-05T06:32:00Z")).toBe("2026.11.05 14:32");
    expect(formatDate("2026-11-05T06:32:00Z")).toBe("2026.11.05");
    expect(formatTime("2026-11-05T00:05:00Z")).toBe("08:05");
  });

  it("rolls over to the next day after 16:00 UTC", () => {
    expect(todayInUlaanbaatar(new Date("2026-11-05T15:59:00Z"))).toBe("2026-11-05");
    expect(todayInUlaanbaatar(new Date("2026-11-05T16:00:00Z"))).toBe("2026-11-06");
  });
});

describe("formatPhone", () => {
  it("groups 8-digit numbers", () => {
    expect(formatPhone("99112233")).toBe("9911 2233");
    expect(formatPhone("+97699112233")).toBe("+97699112233");
    expect(formatPhone(null)).toBe("");
  });
});
