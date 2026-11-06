import { formatDate, formatMNT, formatTime, todayInUlaanbaatar } from "@delivery/shared";
import { ArrowRightIcon, CircleDashedIcon, PackageCheckIcon, TruckIcon, UserCheckIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, Kpi, KpiStrip } from "@/components/layout/card";
import { PageHeader } from "@/components/layout/page-header";
import { AvatarInitial } from "@/components/ui/avatar-initial";
import { DeliveryStatusBadge } from "@/features/deliveries/components/status-badge";
import { listCouriers } from "@/features/deliveries/queries";
import {
  getCourierStats,
  getDashboardStats,
  getRecentActivity,
  getUnassignedQueue,
} from "@/features/stats/queries";
import { NEON, STATUS_COLOR } from "@/lib/neon";
import { UnassignedQueue } from "@/features/stats/unassigned-queue";

export const metadata: Metadata = { title: "Хянах самбар" };

export default async function DashboardPage() {
  const today = todayInUlaanbaatar();
  const range = { from: today, to: today };
  const [stats, queue, couriers, courierStats, activity] = await Promise.all([
    getDashboardStats(range),
    getUnassignedQueue(8),
    listCouriers(),
    getCourierStats(range),
    getRecentActivity(10),
  ]);
  const activeCouriers = courierStats.filter((c) => c.is_active);

  return (
    <>
      <PageHeader
        title="Хянах самбар"
        description={`Өнөөдөр · ${formatDate(new Date())}`}
      />

      <div className="space-y-6">
        <KpiStrip>
          <Kpi
            label="Хуваарилаагүй"
            value={stats.unassigned_now}
            hint={stats.unassigned_now > 0 ? "Хуваарилах шаардлагатай" : "Бүгд хуваарилагдсан"}
            accent={STATUS_COLOR.UNASSIGNED}
            icon={CircleDashedIcon}
            href="/deliveries?status=UNASSIGNED"
          />
          <Kpi
            label="Хуваарилсан"
            value={stats.assigned_now}
            hint="Эхлээгүй байгаа"
            accent={STATUS_COLOR.ASSIGNED}
            icon={UserCheckIcon}
            href="/deliveries?status=ASSIGNED"
          />
          <Kpi
            label="Хүргэж байна"
            value={stats.in_progress_now}
            hint="Замд яваа"
            accent={STATUS_COLOR.IN_PROGRESS}
            icon={TruckIcon}
            href="/deliveries?status=IN_PROGRESS"
          />
          <Kpi
            label="Өнөөдөр хүргэгдсэн"
            value={stats.delivered}
            hint={`Өнөөдөр бүртгэсэн: ${stats.created}`}
            accent={STATUS_COLOR.DELIVERED}
            icon={PackageCheckIcon}
          />
          <Kpi
            label="Төлөгдөөгүй"
            value={formatMNT(stats.unpaid_amount)}
            hint={`${stats.unpaid_count} хүргэлт`}
            accent={NEON.magenta}
            icon={WalletIcon}
            href="/deliveries?payment=UNPAID"
          />
        </KpiStrip>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card
            title="Хуваарилах шаардлагатай"
            description={queue.total > 0 ? `Нийт ${queue.total} · хамгийн удаан хүлээж буй нь эхэнд` : undefined}
            action={
              queue.total > queue.rows.length ? (
                <Link
                  href="/deliveries?status=UNASSIGNED"
                  className="flex items-center gap-1 text-sm text-link hover:underline"
                >
                  Бүгдийг харах
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : null
            }
          >
            <UnassignedQueue rows={queue.rows} couriers={couriers} />
          </Card>

          <Card
            title="Курьерууд"
            description="Өнөөдрийн ачаалал"
            action={
              <Link href="/couriers" className="text-sm text-link hover:underline">
                Дэлгэрэнгүй
              </Link>
            }
          >
            {activeCouriers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Идэвхтэй курьер алга.</p>
            ) : (
              <ul className="-my-2 divide-y">
                {activeCouriers.map((c) => {
                  const active = c.assigned_now + c.in_progress_now;
                  return (
                    <li key={c.courier_id} className="flex items-center gap-3 py-3">
                      <AvatarInitial name={c.full_name} seed={c.courier_id} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/couriers/${c.courier_id}`} className="block truncate text-sm font-medium hover:text-link">
                          {c.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {active > 0 ? `${active} идэвхтэй` : "Чөлөөтэй"} · {c.delivered_count} хүргэсэн
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-sm">{formatMNT(c.cash_collected)}</p>
                        <p className="text-xs text-muted-foreground">бэлэн</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Сүүлийн үйл явдал">
          {activity.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Одоогоор үйл явдал алга.</p>
          ) : (
            <ul className="-my-2 divide-y">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="tabular w-12 text-muted-foreground">{formatTime(a.created_at)}</span>
                  <Link href={`/deliveries/${a.delivery_id}`} className="tabular font-medium hover:text-link hover:underline">
                    {a.delivery?.code}
                  </Link>
                  {a.from_status ? (
                    <span className="flex items-center gap-1.5">
                      <DeliveryStatusBadge status={a.from_status} />
                      <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Бүртгэгдсэн →</span>
                  )}
                  <DeliveryStatusBadge status={a.to_status} />
                  {a.note ? <span className="truncate text-muted-foreground">“{a.note}”</span> : null}
                  <span className="ml-auto text-xs text-muted-foreground">{a.actor ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
