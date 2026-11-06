import { Feather } from "@expo/vector-icons";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  availableActions,
  canRecordPayment,
  formatDate,
  formatDateTime,
  formatMNT,
  formatPhone,
  type PaymentMethod,
} from "@delivery/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet } from "@/components/sheet";
import { Button, Card, EmptyState, ErrorBanner, KeyValue, Loading, PaymentBadge, StatusBadge, text } from "@/components/ui";
import {
  completeDelivery,
  fetchDelivery,
  recordPayment,
  returnDelivery,
  startDelivery,
  type DeliveryDetail,
} from "@/features/deliveries/api";
import { callPhone, openMaps } from "@/lib/maps";
import { useToast } from "@/lib/toast";
import { useQuery } from "@/lib/use-query";
import { colors, font, radius, TOUCH } from "@/theme";

type SheetKind = "complete" | "return" | "payment" | null;

const RETURN_REASONS = ["Машин эвдэрсэн", "Хэт хол байна", "Цаг амжихгүй", "Харилцагч холбогдохгүй байна"];

export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useQuery(() => fetchDelivery(id));

  return (
    <>
      <Stack.Screen options={{ title: data?.code ?? "" }} />
      {error ? (
        <View style={{ padding: 16 }}>
          <ErrorBanner message={error} onRetry={reload} />
        </View>
      ) : null}
      {loading ? <Loading /> : null}
      {data === null ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            icon="slash"
            title="Энэ хүргэлт танд оноогдоогүй байна"
            body="Өөр курьерт шилжсэн эсвэл хуваарилалтаас хасагдсан байж болно."
          />
          <Button label="Буцах" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}
      {data ? <DeliveryView d={data} /> : null}
    </>
  );
}

function DeliveryView({ d }: { d: DeliveryDetail }) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const actions = availableActions({ status: d.status, role: "COURIER", isOwnDelivery: true });
  const canPay = canRecordPayment({
    status: d.status,
    paymentStatus: d.payment_status,
    amountDue: d.amount_due,
    role: "COURIER",
    isOwnDelivery: true,
  });
  const unpaid = d.amount_due > 0 && d.payment_status === "UNPAID";
  const active = d.status === "ASSIGNED" || d.status === "IN_PROGRESS";

  async function run(fn: () => Promise<void>, success: string, after?: () => void) {
    setBusy(true);
    try {
      await fn();
      toast(success);
      setSheet(null);
      after?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Алдаа гарлаа.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badges}>
          <StatusBadge status={d.status} />
          {d.amount_due > 0 ? <PaymentBadge status={d.payment_status} /> : null}
        </View>

        <Text style={[text.h2, { marginTop: 12 }]}>{d.customer_name}</Text>
        <Text style={[text.body, { marginTop: 4 }]}>{d.address}</Text>
        {d.address_note ? <Text style={[text.secondary, { marginTop: 2 }]}>{d.address_note}</Text> : null}

        {active ? (
          <View style={styles.quick}>
            <Button label="Залгах" icon="phone" variant="secondary" size="lg" onPress={() => void callPhone(d.customer_phone)} style={{ flex: 1 }} />
            <Button label="Чиглэл" icon="navigation" variant="secondary" size="lg" onPress={() => void openMaps(d)} style={{ flex: 1 }} />
          </View>
        ) : null}

        {d.notes ? (
          <View style={styles.note}>
            <Feather name="message-square" size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[text.body, { flex: 1 }]}>{d.notes}</Text>
          </View>
        ) : null}

        <Card style={{ marginTop: 16 }}>
          <KeyValue
            label="Утас"
            value={
              <Pressable onPress={() => void callPhone(d.customer_phone)} accessibilityRole="link" hitSlop={8}>
                <Text style={[styles.link]}>{formatPhone(d.customer_phone)}</Text>
              </Pressable>
            }
          />
          <KeyValue label="Илгээмж" value={d.package_description ?? "—"} />
          <KeyValue label="Хүргэх өдөр" value={d.scheduled_date ? formatDate(d.scheduled_date) : "—"} />
          {d.delivered_at ? <KeyValue label="Хүргэсэн" value={formatDateTime(d.delivered_at)} /> : null}
          {d.status === "CANCELLED" ? <KeyValue label="Цуцалсан шалтгаан" value={d.cancel_reason ?? "—"} /> : null}
          <KeyValue label="Код" value={d.code} last />
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={styles.payHead}>
            <Text style={text.secondary}>Төлөх дүн</Text>
            {d.amount_due > 0 ? <PaymentBadge status={d.payment_status} /> : null}
          </View>
          <Text style={styles.bigAmount}>{d.amount_due > 0 ? formatMNT(d.amount_due) : "Төлбөргүй"}</Text>
          {d.payment ? (
            <Text style={text.secondary}>
              {PAYMENT_METHOD_LABELS[d.payment.method]} · {formatDateTime(d.payment.recorded_at)}
            </Text>
          ) : null}
          {canPay ? (
            <Button label="Төлбөр бүртгэх" icon="dollar-sign" variant="secondary" onPress={() => setSheet("payment")} style={{ marginTop: 14 }} />
          ) : null}
          {unpaid && d.status === "ASSIGNED" ? (
            <Text style={[text.secondary, { marginTop: 10 }]}>Хүргэлт эхэлсний дараа төлбөр бүртгэнэ.</Text>
          ) : null}
        </Card>
      </ScrollView>

      {/* One clear primary action, always within thumb reach */}
      {actions.length > 0 ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {actions.includes("start") ? (
            <Button
              label="Хүргэлт эхлүүлэх"
              icon="play"
              size="lg"
              loading={busy}
              onPress={() => run(() => startDelivery(d.id), "Хүргэлт эхэллээ.")}
            />
          ) : null}
          {actions.includes("complete") ? (
            <Button label="Хүргэгдсэн" icon="check" size="lg" onPress={() => setSheet("complete")} />
          ) : null}
          {actions.includes("return") ? (
            <Button label="Хүргэлтийг буцаах" variant="ghost" onPress={() => setSheet("return")} style={{ minHeight: 40 }} />
          ) : null}
        </View>
      ) : null}

      {/* Complete */}
      <Sheet
        visible={sheet === "complete"}
        onClose={() => setSheet(null)}
        busy={busy}
        title={unpaid ? "Төлбөр бүртгэгдээгүй байна" : "Хүргэгдсэн гэж тэмдэглэх үү?"}
        description={
          unpaid
            ? `${formatMNT(d.amount_due)} төлбөрийг эхлээд бүртгэнэ үү. Төлбөргүйгээр дуусгавал админ дараа нь бүртгэнэ.`
            : "Энэ үйлдлийг буцаах боломжгүй."
        }
      >
        {unpaid ? <Button label="Төлбөр бүртгэх" icon="dollar-sign" size="lg" onPress={() => setSheet("payment")} /> : null}
        <Button
          label={unpaid ? "Төлбөргүй дуусгах" : "Хүргэгдсэн"}
          variant={unpaid ? "secondary" : "primary"}
          size="lg"
          loading={busy}
          onPress={() => run(() => completeDelivery(d.id), "Хүргэлт амжилттай дууслаа.", () => router.back())}
        />
        <Button label="Болих" variant="ghost" onPress={() => setSheet(null)} />
      </Sheet>

      {/* Payment — one full payment (D4) */}
      <Sheet
        visible={sheet === "payment"}
        onClose={() => setSheet(null)}
        busy={busy}
        title="Төлбөр бүртгэх"
        description="Нэг удаагийн бүтэн төлбөр."
      >
        <View style={styles.amountBox}>
          <Text style={text.secondary}>Авах дүн</Text>
          <Text style={styles.bigAmount}>{formatMNT(d.amount_due)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }} accessibilityRole="radiogroup">
          {PAYMENT_METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              accessibilityRole="radio"
              accessibilityState={{ checked: method === m }}
              style={[styles.method, method === m && styles.methodActive]}
            >
              <Feather name={m === "CASH" ? "dollar-sign" : "credit-card"} size={18} color={method === m ? colors.primary : colors.textSecondary} />
              <Text style={[styles.methodText, method === m && { color: colors.primary }]}>{PAYMENT_METHOD_LABELS[m]}</Text>
            </Pressable>
          ))}
        </View>
        <Button
          label="Бүртгэх"
          size="lg"
          loading={busy}
          onPress={() => run(() => recordPayment(d.id, method, d.amount_due), "Төлбөр бүртгэгдлээ.")}
        />
        <Button label="Болих" variant="ghost" onPress={() => setSheet(null)} />
      </Sheet>

      {/* Return — reason required (D1) */}
      <Sheet
        visible={sheet === "return"}
        onClose={() => setSheet(null)}
        busy={busy}
        title="Хүргэлтийг буцаах"
        description="Хүргэлт бусад курьерт харагдана. Шалтгаан админд хадгалагдана."
      >
        <View style={styles.chips}>
          {RETURN_REASONS.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} style={[styles.chip, reason === r && styles.chipActive]} accessibilityRole="button">
              <Text style={[styles.chipText, reason === r && { color: colors.primary }]}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Эсвэл шалтгаанаа бичнэ үү"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          multiline
          maxLength={500}
          accessibilityLabel="Буцаах шалтгаан"
        />
        <Button
          label="Буцаах"
          variant="danger"
          size="lg"
          disabled={!reason.trim()}
          loading={busy}
          onPress={() => run(() => returnDelivery(d.id, reason.trim()), "Хүргэлт буцаагдлаа.", () => router.back())}
        />
        <Button label="Болих" variant="ghost" onPress={() => setSheet(null)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, width: "100%", maxWidth: 640, alignSelf: "center" },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quick: { flexDirection: "row", gap: 10, marginTop: 16 },
  note: { flexDirection: "row", gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 14, marginTop: 16 },
  link: { fontFamily: font.semibold, fontSize: 15, color: colors.primary, fontVariant: ["tabular-nums"] },
  payHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bigAmount: { fontFamily: font.bold, fontSize: 26, color: colors.text, marginTop: 4, fontVariant: ["tabular-nums"] },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  amountBox: { backgroundColor: colors.muted, borderRadius: radius.lg, padding: 14 },
  method: { flex: 1, minHeight: TOUCH + 8, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methodText: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  input: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontFamily: font.regular, fontSize: 16, color: colors.text, textAlignVertical: "top" },
});
