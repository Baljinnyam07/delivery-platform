import { describe, expect, it } from "vitest";
import {
  addDays,
  isIsoDate,
  startOfMonth,
  ubDayRange,
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

describe("UB day ranges", () => {
  it("builds half-open ranges in +08:00", () => {
    expect(ubDayRange("2026-11-05")).toEqual({
      from: "2026-11-05T00:00:00+08:00",
      to: "2026-11-06T00:00:00+08:00",
    });
    expect(ubDayRange("2026-12-01", "2026-12-31").to).toBe("2027-01-01T00:00:00+08:00");
  });

  it("does calendar arithmetic across months and leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(startOfMonth("2026-11-05")).toBe("2026-11-01");
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-11-05")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("05.11.2026")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe("formatPhone", () => {
  it("groups 8-digit numbers", () => {
    expect(formatPhone("99112233")).toBe("9911 2233");
    expect(formatPhone("+97699112233")).toBe("+97699112233");
    expect(formatPhone(null)).toBe("");
  });
});
