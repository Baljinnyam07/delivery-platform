import { Feather } from "@expo/vector-icons";
import { formatDate, formatMNT } from "@delivery/shared";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TabScreen } from "@/components/screen";
import { Button, Card, EmptyState, ErrorBanner, Loading, text } from "@/components/ui";
import { claimDelivery, fetchAvailable, type AvailableItem } from "@/features/deliveries/api";
import { emitDeliveriesChanged } from "@/lib/events";
import { useToast } from "@/lib/toast";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

function AvailableCard({ d, onClaimed }: { d: AvailableItem; onClaimed: (id: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    try {
      await claimDelivery(d.id);
      toast(`${d.code} танд оноогдлоо.`);
      onClaimed(d.id);
    } catch (e) {
      // Most often DELIVERY_NOT_AVAILABLE: another courier was faster.
      toast(e instanceof Error ? e.message : "Алдаа гарлаа.", "error");
      emitDeliveriesChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={styles.top}>
        <Text style={text.code}>{d.code}</Text>
        <Text style={text.secondary}>{d.scheduled_date ? formatDate(d.scheduled_date) : formatDate(d.created_at)}</Text>
      </View>
      <View style={styles.row}>
        <Feather name="map-pin" size={15} color={colors.textSecondary} style={{ marginTop: 3 }} />
        <Text style={[text.body, { flex: 1 }]}>{d.address}</Text>
      </View>
      {d.address_note ? <Text style={[text.secondary, { marginLeft: 21 }]}>{d.address_note}</Text> : null}
      {d.package_description ? (
        <View style={styles.row}>
          <Feather name="package" size={15} color={colors.textSecondary} style={{ marginTop: 3 }} />
          <Text style={[text.secondary, { flex: 1 }]}>{d.package_description}</Text>
        </View>
      ) : null}
      <View style={styles.bottom}>
        <Text style={text.amount}>{d.amount_due > 0 ? formatMNT(d.amount_due) : "Төлбөргүй"}</Text>
        <Button label="Авах" icon="plus" onPress={claim} loading={busy} style={{ minWidth: 120 }} />
      </View>
    </Card>
  );
}

export default function AvailableScreen() {
  const { data, error, loading, refreshing, refresh, reload } = useQuery(fetchAvailable);

  return (
    <TabScreen title="Авах боломжтой" subtitle="Хуваарилагдаагүй хүргэлтүүд" refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState icon="inbox" title="Авах хүргэлт алга" body="Шинэ хүргэлт нэмэгдэхэд энд харагдана." />
      ) : null}
      {data?.map((d) => (
        <AvailableCard
          key={d.id}
          d={d}
          onClaimed={(id) => router.push({ pathname: "/delivery/[id]", params: { id } })}
        />
      ))}
      {data && data.length > 0 ? (
        <Text style={[text.secondary, { textAlign: "center", marginTop: 4 }]}>
          Харилцагчийн утас хүргэлтийг авсны дараа харагдана.
        </Text>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  row: { flexDirection: "row", gap: 6, marginTop: 4 },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
});
