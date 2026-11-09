import { z } from "zod";
import {
  MSG,
  amountSchema,
  idSchema,
  optionalDateSchema,
  optionalText,
  phoneSchema,
  reasonSchema,
  requiredText,
} from "./common";

const coordinate = (min: number, max: number) =>
  z.coerce.number().min(min).max(max).nullish().transform((v) => v ?? null);

// Field names match the `deliveries` columns the admin is allowed to write
// (see column grants in supabase/migrations/*_rls.sql).
const deliveryFields = z.object({
  customer_name: requiredText(120),
  customer_phone: phoneSchema,
  address: requiredText(500),
  address_note: optionalText(500),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  package_description: optionalText(500),
  notes: optionalText(1000),
  amount_due: amountSchema,
  /** Part of amount_due (total = goods + fee). Omitted → unchanged / 0. */
  delivery_fee: amountSchema.optional(),
  scheduled_date: optionalDateSchema,
});

function coordsTogether(
  value: { latitude?: number | null; longitude?: number | null },
  ctx: z.RefinementCtx,
) {
  const hasLat = value.latitude != null;
  const hasLng = value.longitude != null;
  if (hasLat !== hasLng) {
    ctx.addIssue({ code: "custom", message: MSG.coordsPair, path: [hasLat ? "longitude" : "latitude"] });
  }
}

/** Admin: create delivery. `id` may be client-generated for idempotent submits. */
export const deliveryCreateSchema = deliveryFields
  .extend({ id: idSchema.optional() })
  .superRefine(coordsTogether);
export type DeliveryCreateInput = z.input<typeof deliveryCreateSchema>;
export type DeliveryCreate = z.output<typeof deliveryCreateSchema>;

/** Admin: edit descriptive fields. */
export const deliveryUpdateSchema = deliveryFields.partial().superRefine(coordsTogether);
export type DeliveryUpdateInput = z.input<typeof deliveryUpdateSchema>;
export type DeliveryUpdate = z.output<typeof deliveryUpdateSchema>;

// ---------------- RPC inputs ----------------

export const deliveryIdSchema = z.object({ deliveryId: idSchema });

export const assignDeliverySchema = z.object({
  deliveryId: idSchema,
  courierId: idSchema,
});

export const reassignDeliverySchema = z.object({
  deliveryId: idSchema,
  courierId: idSchema,
  reason: reasonSchema,
});

/** unassign (admin), return (courier), cancel (admin) */
export const deliveryReasonSchema = z.object({
  deliveryId: idSchema,
  reason: reasonSchema,
});

export const completeDeliverySchema = z.object({
  deliveryId: idSchema,
  note: optionalText(500),
});

export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;
export type ReassignDeliveryInput = z.infer<typeof reassignDeliverySchema>;
export type DeliveryReasonInput = z.infer<typeof deliveryReasonSchema>;
export type CompleteDeliveryInput = z.infer<typeof completeDeliverySchema>;
