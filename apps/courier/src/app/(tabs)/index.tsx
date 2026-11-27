import { formatDate } from "@delivery/shared";
import { router } from "expo-router";
import { DeliveryCard } from "@/components/delivery-card";
import { TabScreen } from "@/components/screen";
import { Button, EmptyState, ErrorBanner, Loading, SectionTitle } from "@/components/ui";
import { fetchActive } from "@/features/deliveries/api";
import { useCourier } from "@/lib/auth";
import { useQuery } from "@/lib/use-query";

export default function MyDeliveriesScreen() {
  const courier = useCourier();
  const { data, error, loading, refreshing, refresh, reload } = useQuery(fetchActive);

  const inProgress = data?.filter((d) => d.status === "IN_PROGRESS") ?? [];
  const assigned = data?.filter((d) => d.status === "ASSIGNED") ?? [];

  return (
    <TabScreen
      title="Миний хүргэлт"
      subtitle={`${courier.full_name} · ${formatDate(new Date())}`}
      refreshing={refreshing}
      onRefresh={refresh}
      action={
        <Button
          label="Захиалга"
          icon="plus"
          onPress={() => router.push("/order/new")}
          accessibilityHint="Шинэ захиалга үүсгэнэ"
          style={{ paddingHorizontal: 14 }}
        />
      }
    >
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Одоогоор хүргэлт алга"
          body="“Авах” хэсгээс хүргэлт сонгох эсвэл “Захиалга” товчоор өөрөө захиалга нэмнэ үү."
        />
      ) : null}

      {inProgress.length > 0 ? (
        <>
          <SectionTitle count={inProgress.length}>Хүргэж байна</SectionTitle>
          {inProgress.map((d) => (
            <DeliveryCard key={d.id} d={d} />
          ))}
        </>
      ) : null}

      {assigned.length > 0 ? (
        <>
          <SectionTitle count={assigned.length}>Хуваарилсан</SectionTitle>
          {assigned.map((d) => (
            <DeliveryCard key={d.id} d={d} />
          ))}
        </>
      ) : null}
    </TabScreen>
  );
}
