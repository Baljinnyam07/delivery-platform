import { formatDate, formatMNT } from "@delivery/shared";
import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import { Card, Kpi, KpiStrip } from "@/components/layout/card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyDeliveredChart } from "@/features/stats/daily-chart";
import { DateRangePicker } from "@/features/stats/date-range-picker";
import { getCourierStats, getDailyReport, parseDateRange } from "@/features/stats/queries";

export const metadata: Metadata = { title: "Тайлан" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const range = parseDateRange(await searchParams);
  const [days, couriers] = await Promise.all([getDailyReport(range), getCourierStats(range)]);

  const totals = days.reduce(
    (acc, d) => ({
      created: acc.created + d.created,
      delivered: acc.delivered + d.delivered,
      cancelled: acc.cancelled + d.cancelled,
      cash: acc.cash + Number(d.cash),
      transfer: acc.transfer + Number(d.transfer),
    }),
    { created: 0, delivered: 0, cancelled: 0, cash: 0, transfer: 0 },
  );
  const rows = days.map((d) => ({ ...d, cash: Number(d.cash), transfer: Number(d.transfer) }));
  const activeCouriers = couriers.filter((c) => c.delivered_count > 0 || Number(c.cash_collected) > 0 || Number(c.transfer_collected) > 0);

  return (
    <>
      <PageHeader
        title="Тайлан"
        description={`${formatDate(range.from)} – ${formatDate(range.to)}`}
        actions={
          <Button variant="outline" asChild className="h-9">
            <a href={`/reports/export?from=${range.from}&to=${range.to}`} download>
              <DownloadIcon />
              CSV татах
            </a>
          </Button>
        }
      />

      <div className="space-y-6">
        <DateRangePicker from={range.from} to={range.to} />

        <KpiStrip>
          <Kpi label="Бүртгэсэн" value={totals.created} />
          <Kpi label="Хүргэсэн" value={totals.delivered} />
          <Kpi label="Цуцалсан" value={totals.cancelled} />
          <Kpi label="Бэлэн орлого" value={formatMNT(totals.cash)} />
          <Kpi label="Дансаар орлого" value={formatMNT(totals.transfer)} />
        </KpiStrip>

        <Card title="Өдөр тутам хүргэсэн" description="Улаанбаатарын цагаар">
          <DailyDeliveredChart days={rows} />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Өдрөөр" bodyClassName="px-0 py-0">
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Огноо</TableHead>
                    <TableHead className="text-right">Бүртгэсэн</TableHead>
                    <TableHead className="text-right">Хүргэсэн</TableHead>
                    <TableHead className="text-right">Цуцалсан</TableHead>
                    <TableHead className="pr-5 text-right">Орлого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].reverse().map((d) => (
                    <TableRow key={d.day}>
                      <TableCell className="tabular pl-5">{formatDate(d.day)}</TableCell>
                      <TableCell className="tabular text-right">{d.created}</TableCell>
                      <TableCell className="tabular text-right font-medium">{d.delivered}</TableCell>
                      <TableCell className="tabular text-right">{d.cancelled}</TableCell>
                      <TableCell className="tabular pr-5 text-right">{formatMNT(d.cash + d.transfer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card title="Курьераар" bodyClassName="px-0 py-0">
            {activeCouriers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Энэ хугацаанд курьерын гүйцэтгэл алга.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Курьер</TableHead>
                    <TableHead className="text-right">Хүргэсэн</TableHead>
                    <TableHead className="text-right">Бэлэн</TableHead>
                    <TableHead className="pr-5 text-right">Дансаар</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCouriers.map((c) => (
                    <TableRow key={c.courier_id}>
                      <TableCell className="pl-5 font-medium">{c.full_name}</TableCell>
                      <TableCell className="tabular text-right">{c.delivered_count}</TableCell>
                      <TableCell className="tabular text-right">{formatMNT(c.cash_collected)}</TableCell>
                      <TableCell className="tabular pr-5 text-right">{formatMNT(c.transfer_collected)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
