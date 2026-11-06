import { Feather } from "@expo/vector-icons";
import { formatMNT } from "@delivery/shared";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MyDelivery } from "@/features/deliveries/api";
import { callPhone, openMaps } from "@/lib/maps";
import { colors, radius, shadow } from "@/theme";
import { Button, PaymentBadge, StatusBadge, text } from "./ui";

/** Own delivery: tap for details; Call and Navigate one tap away. */
export function DeliveryCard({ d }: { d: MyDelivery }) {
  // Info area and action buttons are siblings — never a button inside a button.
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push({ pathname: "/delivery/[id]", params: { id: d.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${d.code}, ${d.customer_name}, ${d.address}`}
        style={({ pressed }) => [styles.info, pressed && { backgroundColor: colors.muted }]}
      >
      <View style={styles.top}>
        <Text style={text.code}>{d.code}</Text>
        <StatusBadge status={d.status} />
      </View>

      <Text style={[text.bodyStrong, { marginTop: 10 }]}>{d.customer_name}</Text>
      <View style={styles.addressRow}>
        <Feather name="map-pin" size={15} color={colors.textSecondary} style={{ marginTop: 2 }} />
        <Text style={[text.secondary, { flex: 1 }]} numberOfLines={2}>
          {d.address}
          {d.address_note ? ` · ${d.address_note}` : ""}
        </Text>
      </View>

      <View style={styles.money}>
        <Text style={text.amount}>{d.amount_due > 0 ? formatMNT(d.amount_due) : "Төлбөргүй"}</Text>
        {d.amount_due > 0 ? <PaymentBadge status={d.payment_status} /> : null}
      </View>
      </Pressable>

      <View style={styles.actions}>
        <Button label="Залгах" icon="phone" variant="secondary" onPress={() => void callPhone(d.customer_phone)} style={{ flex: 1 }} />
        <Button label="Чиглэл" icon="navigation" variant="secondary" onPress={() => void openMaps(d)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: "hidden", ...shadow },
  info: { padding: 16, paddingBottom: 4 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addressRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  money: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 10 },
});
