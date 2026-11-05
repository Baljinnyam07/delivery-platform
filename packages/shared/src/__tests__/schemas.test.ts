import { describe, expect, it } from "vitest";
import { courierCreateSchema, loginSchema } from "../schemas/auth";
import { phoneSchema, reasonSchema } from "../schemas/common";
import { deliveryCreateSchema, deliveryUpdateSchema, reassignDeliverySchema } from "../schemas/delivery";
import { recordPaymentSchema } from "../schemas/payment";

const ID = "8d0b9c1e-4f3a-4c2b-9a1d-2e3f4a5b6c7d";

const validDelivery = {
  customer_name: "  Ганболд ",
  customer_phone: "9911-2233",
  address: "ХУД, 15-р хороо, Зайсан 7",
  amount_due: "25000",
};

describe("phoneSchema", () => {
  it.each([
    ["99112233", "99112233"],
    ["9911 2233", "99112233"],
    ["9911-2233", "99112233"],
    ["+97699112233", "99112233"],
    ["976 9911 2233", "99112233"],
  ])("normalizes %s", (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it.each(["9911223", "991122334", "abcdefgh", ""])("rejects %s", (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe("deliveryCreateSchema", () => {
  it("trims, normalizes and fills nulls", () => {
    const out = deliveryCreateSchema.parse({ ...validDelivery, address_note: "  ", scheduled_date: "" });
    expect(out).toMatchObject({
      customer_name: "Ганболд",
      customer_phone: "99112233",
      amount_due: 25000,
      address_note: null,
      scheduled_date: null,
      latitude: null,
      longitude: null,
    });
  });

  it("rejects missing required fields with Mongolian messages", () => {
    const res = deliveryCreateSchema.safeParse({ ...validDelivery, address: "   " });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Заавал бөглөнө үү.");
  });

  it("rejects negative and fractional amounts", () => {
    expect(deliveryCreateSchema.safeParse({ ...validDelivery, amount_due: -1 }).success).toBe(false);
    expect(deliveryCreateSchema.safeParse({ ...validDelivery, amount_due: 1.5 }).success).toBe(false);
  });

  it("requires latitude and longitude together", () => {
    expect(deliveryCreateSchema.safeParse({ ...validDelivery, latitude: 47.9 }).success).toBe(false);
    expect(
      deliveryCreateSchema.safeParse({ ...validDelivery, latitude: 47.9, longitude: 106.9 }).success,
    ).toBe(true);
  });

  it("accepts a client-generated id", () => {
    expect(deliveryCreateSchema.parse({ ...validDelivery, id: ID }).id).toBe(ID);
    expect(deliveryCreateSchema.safeParse({ ...validDelivery, id: "x" }).success).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(deliveryCreateSchema.safeParse({ ...validDelivery, scheduled_date: "2026-13-40" }).success).toBe(false);
    expect(deliveryCreateSchema.parse({ ...validDelivery, scheduled_date: "2026-11-05" }).scheduled_date).toBe(
      "2026-11-05",
    );
  });
});

describe("deliveryUpdateSchema", () => {
  it("allows partial updates", () => {
    expect(deliveryUpdateSchema.parse({ notes: "Оффисын ресепшнд үлдээх" })).toEqual({
      notes: "Оффисын ресепшнд үлдээх",
    });
  });
});

describe("reasons", () => {
  it("rejects blank reasons", () => {
    expect(reasonSchema.safeParse("   ").success).toBe(false);
    expect(reassignDeliverySchema.safeParse({ deliveryId: ID, courierId: ID, reason: "" }).success).toBe(false);
  });
});

describe("recordPaymentSchema", () => {
  it("accepts a full payment", () => {
    expect(recordPaymentSchema.parse({ deliveryId: ID, method: "CASH", amount: "25000" })).toEqual({
      deliveryId: ID,
      method: "CASH",
      amount: 25000,
      receiptPath: null,
      note: null,
    });
  });

  it("rejects zero amount and unknown method", () => {
    expect(recordPaymentSchema.safeParse({ deliveryId: ID, method: "CASH", amount: 0 }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ deliveryId: ID, method: "CARD", amount: 1 }).success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("lowercases email", () => {
    expect(loginSchema.parse({ email: " Bat@Delivery.TEST ", password: "x" }).email).toBe("bat@delivery.test");
  });

  it("courier password min 8", () => {
    const base = { full_name: "Бат", email: "bat@delivery.test", phone: "99110001" };
    expect(courierCreateSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(courierCreateSchema.safeParse({ ...base, password: "password123" }).success).toBe(true);
  });
});
