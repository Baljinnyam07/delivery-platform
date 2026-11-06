import { formatDate, formatMNT, formatTime } from "@delivery/shared";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TabScreen } from "@/components/screen";
import { EmptyState, ErrorBanner, Loading, PaymentBadge, SectionTitle, StatusBadge, text } from "@/components/ui";
import { fetchHistory, type MyDelivery } from "@/features/deliveries/api";
import { useQuery } from "@/lib/use-query";
import { colors, radius } from "@/theme";

function groupByDay(rows: MyDelivery[]) {
  const groups = new Map<string, MyDelivery[]>();
  for (const d of rows) {
    const at = d.delivered_at ?? d.cancelled_at;
    const key = at ? formatDate(at) : "—";
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()];
}

export default function HistoryScreen() {
  const { data, error, loading, refreshing, refresh, reload } = useQuery(fetchHistory);

  return (
    <TabScreen title="Түүх" subtitle="Сүүлийн 50 хүргэлт" refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {data && data.length === 0 ? <EmptyState icon="clock" title="Түүх хоосон байна" /> : null}

      {data
        ? groupByDay(data).map(([day, rows]) => (
            <View key={day} style={{ marginBottom: 8 }}>
              <SectionTitle count={rows.length}>{day}</SectionTitle>
              <View style={styles.list}>
                {rows.map((d, i) => {
                  const at = d.delivered_at ?? d.cancelled_at;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => router.push({ pathname: "/delivery/[id]", params: { id: d.id } })}
                      style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.muted }]}
                      accessibilityRole="button"
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={text.code}>{d.code}</Text>
                        <Text style={text.secondary} numberOfLines={1}>
                          {at ? `${formatTime(at)} · ` : ""}
                          {d.customer_name}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <StatusBadge status={d.status} />
                        {d.amount_due > 0 && d.status === "DELIVERED" ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={text.secondary}>{formatMNT(d.amount_due)}</Text>
                            <PaymentBadge status={d.payment_status} />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
