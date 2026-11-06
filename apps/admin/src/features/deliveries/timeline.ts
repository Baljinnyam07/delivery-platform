import {
  PAYMENT_METHOD_LABELS,
  formatMNT,
  type DeliveryStatus,
} from "@delivery/shared";
import { NEON, STATUS_COLOR } from "@/lib/neon";
import type { DeliveryDetail } from "./queries";

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string | null;
  actor?: string | null;
  tone: DeliveryStatus | "PAYMENT" | "VOID" | "NEUTRAL";
};

/**
 * Merges status history, assignment audit and payments into one readable,
 * non-duplicated timeline (newest first).
 * - Ownership changes come from delivery_assignments (who, how, why).
 * - IN_PROGRESS / DELIVERED / CANCELLED come from delivery_status_history.
 */
export function buildTimeline({ history, assignments, payments, people }: DeliveryDetail): TimelineEvent[] {
  const name = (id: string | null | undefined) => (id ? (people[id]?.full_name ?? "Тодорхойгүй") : null);
  const events: TimelineEvent[] = [];

  for (const h of history) {
    if (h.from_status === null) {
      events.push({ id: `h${h.id}`, at: h.created_at, title: "Хүргэлт бүртгэгдсэн", actor: name(h.changed_by), tone: "NEUTRAL" });
    } else if (h.to_status === "IN_PROGRESS" || h.to_status === "DELIVERED" || h.to_status === "CANCELLED") {
      const title =
        h.to_status === "IN_PROGRESS"
          ? "Хүргэлт эхэлсэн"
          : h.to_status === "DELIVERED"
            ? "Хүргэгдсэн"
            : "Цуцлагдсан";
      events.push({ id: `h${h.id}`, at: h.created_at, title, detail: h.note, actor: name(h.changed_by), tone: h.to_status });
    }
  }

  for (const a of assignments) {
    const courier = name(a.courier_id);
    const title =
      a.start_action === "CLAIMED"
        ? `${courier} хүргэлтийг авсан`
        : a.start_action === "REASSIGNED"
          ? `${name(a.previous_courier_id)} → ${courier} дахин хуваарилсан`
          : `${courier}-д хуваарилсан`;
    events.push({
      id: `a${a.id}`,
      at: a.started_at,
      title,
      detail: a.start_note,
      actor: a.start_action === "CLAIMED" ? null : name(a.started_by),
      tone: "ASSIGNED",
    });

    if (a.ended_at && (a.end_reason === "RETURNED" || a.end_reason === "UNASSIGNED")) {
      events.push({
        id: `a${a.id}-end`,
        at: a.ended_at,
        title: a.end_reason === "RETURNED" ? `${courier} хүргэлтийг буцаасан` : `${courier}-аас хасагдсан`,
        detail: a.end_note,
        actor: a.end_reason === "RETURNED" ? null : name(a.ended_by),
        tone: "UNASSIGNED",
      });
    }
  }

  for (const p of payments) {
    events.push({
      id: `p${p.id}`,
      at: p.recorded_at,
      title: `Төлбөр бүртгэгдсэн · ${formatMNT(p.amount)} · ${PAYMENT_METHOD_LABELS[p.method]}`,
      detail: p.note,
      actor: name(p.recorded_by),
      tone: "PAYMENT",
    });
    if (p.voided_at) {
      events.push({
        id: `p${p.id}-void`,
        at: p.voided_at,
        title: "Төлбөр хүчингүй болсон",
        detail: p.void_reason,
        actor: name(p.voided_by),
        tone: "VOID",
      });
    }
  }

  return events.sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
}

export const TONE_COLOR: Record<TimelineEvent["tone"], string> = {
  ...STATUS_COLOR,
  PAYMENT: NEON.green,
  VOID: NEON.red,
  NEUTRAL: "#8F95C4",
} as Record<TimelineEvent["tone"], string>;
