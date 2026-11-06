import {
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  formatMNT,
  formatPhone,
  idSchema,
} from "@delivery/shared";
import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Kpi, KpiStrip } from "@/components/layout/card";
import { PageHeader } from "@/components/layout/page-header";
import { CourierActions, CourierStatusBadge } from "@/features/couriers/courier-dialogs";
import { getCourierDetail } from "@/features/couriers/queries";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/features/deliveries/components/status-badge";
import { DateRangePicker } from "@/features/stats/date-range-picker";
import { getCourierStats, parseDateRange } from "@/features/stats/queries";

export const metadata: Metadata = { title: "Курьер" };

export default async function CourierDetailPage({ params, searchParams }: PageProps<"/couriers/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const range = parseDateRange(await searchParams);

  const [detail, stats] = await Promise.all([getCourierDetail(id, range), getCourierStats(range)]);
  if (!detail) notFound();
  const s = stats.find((r) => r.courier_id === id);
  const { profile } = detail;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/couriers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeftIcon className="size-4" />
            Курьерууд
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {profile.full_name}
            <CourierStatusBadge active={profile.is_active} />
          </span>
        }
        description={[detail.email, formatPhone(profile.phone)].filter(Boolean).join(" · ")}
        actions={<CourierActions courier={profile} variant="buttons" />}
      />

      <div className="space-y-6">
        <DateRangePicker from={range.from} to={range.to} />

        <KpiStrip>
          <Kpi label="Одоо идэвхтэй" value={(s?.assigned_now ?? 0) + (s?.in_progress_now ?? 0)} hint={`${s?.in_progress_now ?? 0} замд яваа`} />
          <Kpi label="Хүргэсэн" value={s?.delivered_count ?? 0} hint="Сонгосон хугацаанд" />
          <Kpi label="Дундаж хугацаа" value={s?.avg_delivery_minutes == null ? "—" : s.avg_delivery_minutes < 1 ? "<1 мин" : `${s.avg_delivery_minutes} мин`} hint="Эхлүүлснээс хүргэх хүртэл" />
          <Kpi label="Бэлэн мөнгө" value={formatMNT(s?.cash_collected ?? 0)} hint="Хүлээлгэн өгөх дүн" />
          <Kpi label="Дансаар" value={formatMNT(s?.transfer_collected ?? 0)} />
        </KpiStrip>

        <Card title="Одоогийн хүргэлтүүд" bodyClassName="px-0 py-0">
          {detail.active.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Идэвхтэй хүргэлт алга.</p>
          ) : (
            <ul className="divide-y">
              {detail.active.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <Link href={`/deliveries/${d.id}`} className="tabular w-24 font-medium hover:text-link hover:underline">
                    {d.code}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">
                    {d.customer_name} · <span className="text-muted-foreground">{d.address}</span>
                  </span>
                  <DeliveryStatusBadge status={d.status} />
                  <span className="tabular w-24 text-right">{formatMNT(d.amount_due)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Хүргэсэн" description="Сонгосон хугацаанд (сүүлийн 50)" bodyClassName="px-0 py-0">
            {detail.finished.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Энэ хугацаанд хүргэлт алга.</p>
            ) : (
              <ul className="divide-y">
                {detail.finished.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Link href={`/deliveries/${d.id}`} className="tabular w-24 font-medium hover:text-link hover:underline">
                      {d.code}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {d.delivered_at ? formatDateTime(d.delivered_at) : ""}
                    </span>
                    {d.amount_due > 0 ? <PaymentStatusBadge status={d.payment_status} /> : null}
                    <span className="tabular w-24 text-right">{formatMNT(d.amount_due)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Бүртгэсэн төлбөр" description="Сонгосон хугацаанд (сүүлийн 50)" bodyClassName="px-0 py-0">
            {detail.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Энэ хугацаанд төлбөр бүртгээгүй.</p>
            ) : (
              <ul className="divide-y">
                {detail.payments.map((p) => (
                  <li key={p.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${p.voided_at ? "text-muted-foreground line-through" : ""}`}>
                    <Link href={`/deliveries/${p.delivery?.id}`} className="tabular w-24 font-medium hover:text-link hover:underline">
                      {p.delivery?.code}
                    </Link>
                    <span className="flex-1 text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[p.method]} · {formatDateTime(p.recorded_at)}
                    </span>
                    <span className="tabular w-24 text-right">{formatMNT(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
