import { PAYMENT_METHOD_LABELS, formatDateTime, formatMNT } from "@delivery/shared";
import { WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, Kpi, KpiStrip } from "@/components/layout/card";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MethodFilter } from "@/features/payments/method-filter";
import { VoidPaymentButton } from "@/features/payments/payment-dialogs";
import { listDeliveredUnpaid, listPayments, parseMethod, PAYMENTS_LIMIT } from "@/features/payments/queries";
import { DateRangePicker } from "@/features/stats/date-range-picker";
import { getCourierStats, getDashboardStats, parseDateRange } from "@/features/stats/queries";

export const metadata: Metadata = { title: "Төлбөр" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const params = await searchParams;
  const range = parseDateRange(params);
  const method = parseMethod(params.method);

  const [payments, stats, couriers, unpaid] = await Promise.all([
    listPayments(range, method),
    getDashboardStats(range),
    getCourierStats(range),
    listDeliveredUnpaid(20),
  ]);
  const voidedCount = payments.filter((p) => p.voided_at).length;
  const cashHolders = couriers.filter((c) => Number(c.cash_collected) > 0);

  return (
    <>
      <PageHeader title="Төлбөр" description="Бүртгэгдсэн төлбөр, курьерын гарт байгаа бэлэн мөнгө, төлөгдөөгүй хүргэлт." />

      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DateRangePicker from={range.from} to={range.to} />
          <MethodFilter />
        </div>

        <KpiStrip>
          <Kpi label="Нийт орлого" value={formatMNT(stats.collected_cash + stats.collected_transfer)} hint="Сонгосон хугацаанд" />
          <Kpi label="Бэлэн" value={formatMNT(stats.collected_cash)} />
          <Kpi label="Дансаар" value={formatMNT(stats.collected_transfer)} />
          <Kpi label="Хүчингүй болсон" value={voidedCount} hint="Бүртгэлийн тоо" />
          <Kpi
            label="Төлөгдөөгүй"
            value={formatMNT(stats.unpaid_amount)}
            hint={`${stats.unpaid_count} хүргэлт · одоогийн байдлаар`}
            href="/deliveries?payment=UNPAID"
          />
        </KpiStrip>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Курьерын гарт байгаа бэлэн мөнгө" description="Сонгосон хугацаанд бүртгэсэн бэлэн төлбөр" bodyClassName="px-0 py-0">
            {cashHolders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Бэлэн төлбөр бүртгэгдээгүй.</p>
            ) : (
              <ul className="divide-y">
                {cashHolders.map((c) => (
                  <li key={c.courier_id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/couriers/${c.courier_id}?from=${range.from}&to=${range.to}`} className="font-medium hover:text-link hover:underline">
                      {c.full_name}
                    </Link>
                    <span className="tabular font-medium">{formatMNT(c.cash_collected)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Хүргэгдсэн боловч төлөгдөөгүй"
            description={unpaid.total > 0 ? `Нийт ${unpaid.total} · хамгийн хуучин нь эхэнд` : "Мөнгө нь цуглуулагдах ёстой хүргэлтүүд"}
            bodyClassName="px-0 py-0"
          >
            {unpaid.rows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Ийм хүргэлт алга.</p>
            ) : (
              <ul className="divide-y">
                {unpaid.rows.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Link href={`/deliveries/${d.id}`} className="tabular w-24 font-medium hover:text-link hover:underline">
                      {d.code}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {d.customer_name} · {d.courier?.full_name ?? "—"}
                    </span>
                    <span className="tabular font-medium">{formatMNT(d.amount_due)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card
          title="Төлбөрийн бүртгэл"
          description={payments.length === PAYMENTS_LIMIT ? `Сүүлийн ${PAYMENTS_LIMIT}. Хугацааг богиносгож шүүнэ үү.` : `${payments.length} бүртгэл`}
          bodyClassName="px-0 py-0"
        >
          {payments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <WalletIcon className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">Энэ хугацаанд төлбөр бүртгэгдээгүй.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Огноо</TableHead>
                  <TableHead>Хүргэлт</TableHead>
                  <TableHead>Хэлбэр</TableHead>
                  <TableHead>Бүртгэсэн</TableHead>
                  <TableHead className="text-right">Дүн</TableHead>
                  <TableHead className="pr-5 text-right">
                    <span className="sr-only">Үйлдэл</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className={p.voided_at ? "text-muted-foreground" : undefined}>
                    <TableCell className="tabular pl-5">{formatDateTime(p.recorded_at)}</TableCell>
                    <TableCell>
                      <Link href={`/deliveries/${p.delivery?.id}`} className="tabular font-medium hover:text-link hover:underline">
                        {p.delivery?.code}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.delivery?.customer_name}</div>
                    </TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell>{p.recordedBy?.full_name ?? "—"}</TableCell>
                    <TableCell className={`tabular text-right font-medium ${p.voided_at ? "line-through" : ""}`}>
                      {formatMNT(p.amount)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {p.voided_at ? (
                        <span className="text-xs" title={p.void_reason ?? undefined}>
                          Хүчингүй · {p.voidedBy}
                        </span>
                      ) : (
                        <VoidPaymentButton payment={{ id: p.id, amount: p.amount, code: p.delivery?.code }} size="xs" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
