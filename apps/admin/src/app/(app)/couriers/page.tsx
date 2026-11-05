import { formatMNT, formatPhone } from "@delivery/shared";
import { UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CourierActions, CourierStatusBadge, NewCourierButton } from "@/features/couriers/courier-dialogs";
import { DateRangePicker } from "@/features/stats/date-range-picker";
import { getCourierStats, parseDateRange } from "@/features/stats/queries";

export const metadata: Metadata = { title: "Курьерууд" };

function formatMinutes(min: number | null) {
  if (min == null) return "—";
  if (min < 1) return "<1 мин";
  if (min < 60) return `${min} мин`;
  return `${Math.floor(min / 60)} ц ${min % 60} мин`;
}

export default async function CouriersPage({ searchParams }: PageProps<"/couriers">) {
  const range = parseDateRange(await searchParams);
  const rows = await getCourierStats(range);
  const totals = rows.reduce(
    (acc, r) => ({
      delivered: acc.delivered + r.delivered_count,
      cash: acc.cash + Number(r.cash_collected),
      transfer: acc.transfer + Number(r.transfer_collected),
    }),
    { delivered: 0, cash: 0, transfer: 0 },
  );

  return (
    <>
      <PageHeader
        title="Курьерууд"
        description="Курьерын бүртгэл, ачаалал, гүйцэтгэл."
        actions={<NewCourierButton />}
      />

      <div className="space-y-4">
        <DateRangePicker from={range.from} to={range.to} />

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <UsersIcon className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">Курьер бүртгэгдээгүй байна</p>
              <p className="text-sm text-muted-foreground">“Курьер нэмэх” товчоор эхний курьерыг нэмнэ үү.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Курьер</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Хуваарилсан</TableHead>
                  <TableHead className="text-right">Хүргэж байна</TableHead>
                  <TableHead className="text-right">Хүргэсэн</TableHead>
                  <TableHead className="text-right">Дундаж хугацаа</TableHead>
                  <TableHead className="text-right">Бэлэн мөнгө</TableHead>
                  <TableHead className="text-right">Дансаар</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Үйлдэл</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.courier_id} className={r.is_active ? undefined : "text-muted-foreground"}>
                    <TableCell className="pl-4">
                      <Link href={`/couriers/${r.courier_id}?from=${range.from}&to=${range.to}`} className="font-medium hover:text-primary hover:underline">
                        {r.full_name}
                      </Link>
                      <div className="tabular text-xs text-muted-foreground">{formatPhone(r.phone) || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <CourierStatusBadge active={r.is_active} />
                    </TableCell>
                    <TableCell className="tabular text-right">{r.assigned_now}</TableCell>
                    <TableCell className="tabular text-right">{r.in_progress_now}</TableCell>
                    <TableCell className="tabular text-right font-medium">{r.delivered_count}</TableCell>
                    <TableCell className="tabular text-right">{formatMinutes(r.avg_delivery_minutes)}</TableCell>
                    <TableCell className="tabular text-right">{formatMNT(r.cash_collected)}</TableCell>
                    <TableCell className="tabular text-right">{formatMNT(r.transfer_collected)}</TableCell>
                    <TableCell className="pr-4">
                      <CourierActions
                        courier={{ id: r.courier_id, full_name: r.full_name, phone: r.phone, is_active: r.is_active }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
                  <TableCell className="pl-4" colSpan={4}>
                    Нийт
                  </TableCell>
                  <TableCell className="tabular text-right">{totals.delivered}</TableCell>
                  <TableCell />
                  <TableCell className="tabular text-right">{formatMNT(totals.cash)}</TableCell>
                  <TableCell className="tabular text-right">{formatMNT(totals.transfer)}</TableCell>
                  <TableCell className="pr-4" />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          “Бэлэн мөнгө” нь сонгосон хугацаанд курьерын бүртгэсэн, хүчингүй болоогүй бэлэн төлбөрийн нийлбэр — курьерын
          гарт байгаа, хүлээлгэн өгөх ёстой дүн.
        </p>
      </div>
    </>
  );
}
