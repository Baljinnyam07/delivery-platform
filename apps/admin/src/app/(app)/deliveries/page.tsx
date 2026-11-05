import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveriesTable } from "@/features/deliveries/components/deliveries-table";
import { DeliveriesToolbar } from "@/features/deliveries/components/deliveries-toolbar";
import { NewDeliveryButton } from "@/features/deliveries/components/new-delivery-button";
import { Pagination } from "@/features/deliveries/components/pagination";
import { listCouriers, listDeliveries, PAGE_SIZE, parseFilters } from "@/features/deliveries/queries";

export const metadata: Metadata = { title: "Хүргэлтүүд" };

export default async function DeliveriesPage({ searchParams }: PageProps<"/deliveries">) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const [{ rows, total, counts }, couriers] = await Promise.all([listDeliveries(filters), listCouriers()]);

  return (
    <>
      <PageHeader
        title="Хүргэлтүүд"
        description="Бүх хүргэлтийг бүртгэх, хуваарилах, хянах."
        actions={<NewDeliveryButton />}
      />

      <div className="space-y-4">
        <DeliveriesToolbar counts={counts} couriers={couriers} />
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <DeliveriesTable rows={rows} couriers={couriers} />
          {total > 0 ? <Pagination page={filters.page} pageSize={PAGE_SIZE} total={total} params={params} /> : null}
        </div>
      </div>
    </>
  );
}
