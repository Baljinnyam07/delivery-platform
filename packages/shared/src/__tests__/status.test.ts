import { describe, expect, it } from "vitest";
import { DELIVERY_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "../enums";
import {
  DELIVERY_STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_META,
  availableActions,
  canPerformAction,
  canRecordPayment,
} from "../status";

describe("status metadata", () => {
  it("covers every enum value", () => {
    expect(Object.keys(DELIVERY_STATUS_META).sort()).toEqual([...DELIVERY_STATUSES].sort());
    expect(Object.keys(PAYMENT_STATUS_META).sort()).toEqual([...PAYMENT_STATUSES].sort());
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual([...PAYMENT_METHODS].sort());
  });

  it("uses the approved design-system colors", () => {
    expect(DELIVERY_STATUS_META.DELIVERED.color).toBe("#16A34A");
    expect(DELIVERY_STATUS_META.IN_PROGRESS.color).toBe("#EAB308");
    expect(DELIVERY_STATUS_META.ASSIGNED.color).toBe("#2563EB");
    expect(DELIVERY_STATUS_META.CANCELLED.color).toBe("#DC2626");
    expect(DELIVERY_STATUS_META.UNASSIGNED.color).toBe("#8B5CF6");
  });
});

describe("delivery action rules (mirror of DB RPCs)", () => {
  const admin = (status: (typeof DELIVERY_STATUSES)[number]) =>
    ({ status, role: "ADMIN", isOwnDelivery: false }) as const;
  const courier = (status: (typeof DELIVERY_STATUSES)[number], isOwnDelivery = true) =>
    ({ status, role: "COURIER", isOwnDelivery }) as const;

  it("admin actions per status", () => {
    expect(availableActions(admin("UNASSIGNED"))).toEqual(["assign", "cancel"]);
    expect(availableActions(admin("ASSIGNED"))).toEqual(["reassign", "unassign", "cancel"]);
    expect(availableActions(admin("IN_PROGRESS"))).toEqual(["cancel"]);
    expect(availableActions(admin("DELIVERED"))).toEqual([]);
    expect(availableActions(admin("CANCELLED"))).toEqual([]);
  });

  it("courier actions per status", () => {
    expect(availableActions(courier("UNASSIGNED", false))).toEqual(["claim"]);
    expect(availableActions(courier("ASSIGNED"))).toEqual(["return", "start"]);
    expect(availableActions(courier("IN_PROGRESS"))).toEqual(["complete"]);
    expect(availableActions(courier("DELIVERED"))).toEqual([]);
  });

  it("IN_PROGRESS can never be reassigned, unassigned or returned", () => {
    expect(canPerformAction("reassign", admin("IN_PROGRESS"))).toBe(false);
    expect(canPerformAction("unassign", admin("IN_PROGRESS"))).toBe(false);
    expect(canPerformAction("return", courier("IN_PROGRESS"))).toBe(false);
  });

  it("courier cannot act on someone else's delivery", () => {
    expect(availableActions(courier("ASSIGNED", false))).toEqual([]);
    expect(availableActions(courier("IN_PROGRESS", false))).toEqual([]);
  });
});

describe("canRecordPayment (mirror of record_payment)", () => {
  const base = { amountDue: 25000, paymentStatus: "UNPAID", isOwnDelivery: true } as const;

  it("courier: only own IN_PROGRESS / DELIVERED", () => {
    expect(canRecordPayment({ ...base, role: "COURIER", status: "ASSIGNED" })).toBe(false);
    expect(canRecordPayment({ ...base, role: "COURIER", status: "IN_PROGRESS" })).toBe(true);
    expect(canRecordPayment({ ...base, role: "COURIER", status: "DELIVERED" })).toBe(true);
    expect(
      canRecordPayment({ ...base, role: "COURIER", status: "DELIVERED", isOwnDelivery: false }),
    ).toBe(false);
  });

  it("admin: any non-cancelled", () => {
    expect(canRecordPayment({ ...base, role: "ADMIN", status: "UNASSIGNED" })).toBe(true);
    expect(canRecordPayment({ ...base, role: "ADMIN", status: "CANCELLED" })).toBe(false);
  });

  it("never when already paid or nothing due", () => {
    expect(canRecordPayment({ ...base, role: "ADMIN", status: "DELIVERED", paymentStatus: "PAID" })).toBe(false);
    expect(canRecordPayment({ ...base, role: "ADMIN", status: "DELIVERED", amountDue: 0 })).toBe(false);
  });
});
