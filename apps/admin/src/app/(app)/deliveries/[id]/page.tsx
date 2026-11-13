import {
  PAYMENT_METHOD_LABELS,
  canRecordPayment,
  formatDate,
  formatDateTime,
  formatMNT,
  formatPhone,
  idSchema,
} from "@delivery/shared";
import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryDetailActions } from "@/features/deliveries/components/delivery-detail-actions";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/features/deliveries/components/status-badge";
import { getDeliveryDetail, listCouriers } from "@/features/deliveries/queries";
import { listPickerProducts } from "@/features/products/queries";
import { RecordPaymentButton, VoidPaymentButton } from "@/features/payments/payment-dialogs";
import { buildTimeline, TONE_COLOR } from "@/features/deliveries/timeline";

export const metadata: Metadata = { title: "Хүргэлт" };

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl neon-panel">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-2 text-sm sm:grid-cols-[160px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function DeliveryDetailPage({ params }: PageProps<"/deliveries/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const [detail, couriers, products] = await Promise.all([
    getDeliveryDetail(id),
    listCouriers(),
    listPickerProducts(),
  ]);
  if (!detail) notFound();

  const { delivery: d, payments, items } = detail;
  const itemsTotal = items.reduce((s, i) => s + Number(i.line_total ?? 0), 0);
  const timeline = buildTimeline(detail);
  const activePayment = payments.find((p) => !p.voided_at);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : d.address,
  )}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/deliveries"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Хүргэлтүүд
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{d.code}</span>
            <DeliveryStatusBadge status={d.status} />
            {d.amount_due > 0 ? <PaymentStatusBadge status={d.payment_status} /> : null}
          </span>
        }
        description={`Бүртгэсэн: ${formatDateTime(d.created_at)}`}
        actions={
          <DeliveryDetailActions
            delivery={{ ...d, courierName: d.courier?.full_name ?? null }}
            couriers={couriers}
            products={products}
            items={items.map((i) => ({
              product_id: i.product_id,
              product_name: i.product_name,
              unit: i.unit,
              unit_price: Number(i.unit_price),
              quantity: i.quantity,
              factory_name: i.factory?.name ?? null,
            }))}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card title="Хүргэлтийн мэдээлэл">
            <dl className="divide-y">
              <Row label="Харилцагч">{d.customer_name}</Row>
              <Row label="Утас">
                <a href={`tel:${d.customer_phone}`} className="tabular hover:text-link">
                  {formatPhone(d.customer_phone)}
                </a>
              </Row>
              <Row label="Хаяг">
                <span>{d.address}</span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex w-fit items-center gap-1 text-xs text-link hover:underline"
                >
                  Google Maps дээр харах
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Row>
              <Row label="Нэмэлт заавар">{d.address_note}</Row>
              {items.length ? null : <Row label="Илгээмж">{d.package_description}</Row>}
              <Row label="Хүргэх өдөр">{d.scheduled_date ? formatDate(d.scheduled_date) : null}</Row>
              <Row label="Тэмдэглэл">{d.notes ? <span className="whitespace-pre-line">{d.notes}</span> : null}</Row>
              {d.status === "CANCELLED" ? <Row label="Цуцалсан шалтгаан">{d.cancel_reason}</Row> : null}
            </dl>
          </Card>

          {items.length > 0 ? (
            <Card title={`Бараа · ${items.reduce((s, i) => s + i.quantity, 0)} ширхэг`}>
              <ul className="-mx-5 -my-4 divide-y divide-white/[0.06]">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.product_name}</p>
                      <p className="text-xs text-muted-foreground">{i.factory?.name}</p>
                    </div>
                    <span className="tabular text-muted-foreground">
                      {i.quantity} {i.unit} × {formatMNT(Number(i.unit_price))}
                    </span>
                    <span className="tabular w-28 text-right font-semibold">{formatMNT(Number(i.line_total ?? 0))}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-white/[0.03] px-5 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Барааны дүн
                    {itemsTotal !== Number(d.amount_due) - Number(d.delivery_fee) ? " (дүнг гараар өөрчилсөн)" : ""}
                  </span>
                  <span className="tabular font-semibold">{formatMNT(itemsTotal)}</span>
                </li>
              </ul>
            </Card>
          ) : null}

          <Card
            title="Төлбөр"
            action={
              canRecordPayment({
                status: d.status,
                paymentStatus: d.payment_status,
                amountDue: d.amount_due,
                role: "ADMIN",
                isOwnDelivery: false,
              }) ? (
                <RecordPaymentButton delivery={d} />
              ) : activePayment ? (
                <VoidPaymentButton payment={{ id: activePayment.id, amount: activePayment.amount, code: d.code }} />
              ) : null
            }
          >
            <dl className="divide-y">
              {Number(d.delivery_fee) > 0 ? (
                <>
                  <Row label="Барааны дүн">
                    <span className="tabular">{formatMNT(Number(d.amount_due) - Number(d.delivery_fee))}</span>
                  </Row>
                  <Row label="Хүргэлтийн үнэ">
                    <span className="tabular">{formatMNT(d.delivery_fee)}</span>
                  </Row>
                </>
              ) : null}
              <Row label="Нийт төлбөр">
                <span className="tabular font-semibold">{formatMNT(d.amount_due)}</span>
              </Row>
              <Row label="Төлөв">
                {d.amount_due > 0 ? (
                  <PaymentStatusBadge status={d.payment_status} />
                ) : (
                  <span className="text-muted-foreground">Төлбөргүй</span>
                )}
              </Row>
              {activePayment ? (
                <>
                  <Row label="Хэлбэр">{PAYMENT_METHOD_LABELS[activePayment.method]}</Row>
                  <Row label="Бүртгэсэн">
                    {detail.people[activePayment.recorded_by]?.full_name} · {formatDateTime(activePayment.recorded_at)}
                  </Row>
                </>
              ) : null}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Курьер">
            {d.courier ? (
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {d.courier.full_name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-medium">{d.courier.full_name}</p>
                  {d.assigned_at ? (
                    <p className="text-xs text-muted-foreground">Хуваарилсан: {formatDateTime(d.assigned_at)}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Курьер хуваарилагдаагүй байна.</p>
            )}
          </Card>

          <Card title="Түүх">
            <ol className="relative space-y-5">
              {timeline.map((e, i) => (
                <li key={e.id} className="relative flex gap-3">
                  {i < timeline.length - 1 ? (
                    <span className="absolute top-4 bottom-[-20px] left-[5px] w-px bg-border" aria-hidden />
                  ) : null}
                  <span
                    className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-card"
                    style={{ backgroundColor: TONE_COLOR[e.tone], boxShadow: `0 0 0 1px ${TONE_COLOR[e.tone]}33` }}
                    aria-hidden
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.detail ? <p className="text-sm text-muted-foreground">“{e.detail}”</p> : null}
                    <p className="tabular text-xs text-muted-foreground">
                      {formatDateTime(e.at)}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
