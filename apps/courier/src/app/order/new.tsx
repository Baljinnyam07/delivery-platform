import { Feather } from "@expo/vector-icons";
import { deliveryCreateSchema, formatMNT, getErrorMessage } from "@delivery/shared";
import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, ErrorBanner, Loading } from "@/components/ui";
import { createOrder, fetchOrderProducts, type OrderProduct } from "@/features/deliveries/api";
import { useToast } from "@/lib/toast";
import { useQuery } from "@/lib/use-query";
import { colors, font, radius, TOUCH } from "@/theme";

type Values = {
  customer_name: string;
  customer_phone: string;
  address: string;
  address_note: string;
  package_description: string;
  goods_amount: string;
  delivery_fee: string;
  notes: string;
};

const EMPTY: Values = {
  customer_name: "",
  customer_phone: "",
  address: "",
  address_note: "",
  package_description: "",
  goods_amount: "",
  delivery_fee: "",
  notes: "",
};

const digits = (v: string) => v.replace(/\D/g, "");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Idempotency key for the submit (no native crypto module needed for OTA).
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const LIST_LIMIT = 30;

export default function NewOrderScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const products = useQuery(fetchOrderProducts);

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "items" | "form" | "amount_due", string>>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [factory, setFactory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderId] = useState(uuid);

  const set = (key: keyof Values) => (v: string) => setValues((s) => ({ ...s, [key]: v }));

  const list = useMemo(() => products.data ?? [], [products.data]);
  const byId = useMemo(() => new Map(list.map((p) => [p.id, p])), [list]);
  const factories = useMemo(() => [...new Map(list.map((p) => [p.factory_id, p.factory_name])).entries()], [list]);

  const results = useMemo(() => {
    const q = norm(query);
    return list.filter(
      (p) =>
        (!factory || p.factory_id === factory) &&
        (!q || norm(p.name).includes(q) || norm(p.factory_name).includes(q)),
    );
  }, [list, query, factory]);

  const cartLines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is { product: OrderProduct; qty: number } => Boolean(l.product) && l.qty > 0);
  const hasItems = cartLines.length > 0;
  const goods = hasItems
    ? cartLines.reduce((s, l) => s + Number(l.product.unit_price) * l.qty, 0)
    : Number(digits(values.goods_amount) || 0);
  const fee = Number(digits(values.delivery_fee) || 0);
  const total = goods + fee;

  function setQty(p: OrderProduct, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[p.id];
      else next[p.id] = Math.min(qty, p.stock);
      return next;
    });
  }

  async function submit() {
    const parsed = deliveryCreateSchema.safeParse({
      id: orderId,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      address: values.address,
      address_note: values.address_note,
      package_description: hasItems ? "" : values.package_description,
      notes: values.notes,
      amount_due: String(total),
      delivery_fee: String(fee),
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof typeof errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const id = await createOrder({
        delivery: { ...parsed.data, id: orderId },
        items: cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        amount: hasItems ? null : goods,
      });
      toast("Захиалга үүслээ. Танд оноогдлоо.");
      router.replace(`/delivery/${id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : getErrorMessage(null);
      setErrors({ form: message });
      products.reload(); // stock may have changed
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Харилцагч">
          <Field label="Нэр" error={errors.customer_name}>
            <Input value={values.customer_name} onChangeText={set("customer_name")} autoCapitalize="words" maxLength={120} />
          </Field>
          <Field label="Утас" error={errors.customer_phone}>
            <Input value={values.customer_phone} onChangeText={set("customer_phone")} keyboardType="phone-pad" placeholder="9911 2233" maxLength={16} />
          </Field>
        </Section>

        <Section title="Хаяг">
          <Field label="Хүргэх хаяг" error={errors.address}>
            <Input value={values.address} onChangeText={set("address")} placeholder="Дүүрэг, хороо, байр, тоот" multiline maxLength={500} style={{ minHeight: 76 }} />
          </Field>
          <Field label="Нэмэлт заавар" error={errors.address_note}>
            <Input value={values.address_note} onChangeText={set("address_note")} placeholder="Орц, давхар, код" maxLength={500} />
          </Field>
        </Section>

        <Section title="Бараа">
          {products.error ? <ErrorBanner message={products.error} onRetry={products.reload} /> : null}
          {products.loading ? <Loading /> : null}
          {list.length > 0 ? (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <View style={styles.search}>
                <Feather name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Бараа хайх…"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.searchInput}
                  accessibilityLabel="Бараа хайх"
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Хайлт цэвэрлэх">
                    <Feather name="x" size={18} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {[[null, "Бүгд"] as const, ...factories].map(([id, name]) => (
                  <Pressable
                    key={id ?? "all"}
                    onPress={() => setFactory(id)}
                    style={[styles.chip, factory === id && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: factory === id }}
                  >
                    <Text style={[styles.chipText, factory === id && { color: colors.white }]}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {results.length === 0 ? (
                <Text style={styles.noResults}>Бараа олдсонгүй</Text>
              ) : (
                results.slice(0, LIST_LIMIT).map((p) => {
                  const qty = cart[p.id] ?? 0;
                  const out = p.stock === 0;
                  return (
                    <Pressable
                      key={p.id}
                      disabled={out}
                      onPress={() => setQty(p, qty + 1)}
                      style={({ pressed }) => [styles.productRow, qty > 0 && { backgroundColor: colors.primarySoft }, pressed && { backgroundColor: colors.muted }, out && { opacity: 0.4 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name} нэмэх`}
                    >
                      <View style={[styles.addBox, qty > 0 && styles.addBoxActive]}>
                        {qty > 0 ? <Text style={styles.addBoxText}>{qty}</Text> : <Feather name="plus" size={16} color={colors.textSecondary} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.productMeta} numberOfLines={1}>
                          {out ? "Дууссан" : `${p.stock} ${p.unit} үлдсэн`}
                          {factory ? "" : ` · ${p.factory_name}`}
                        </Text>
                      </View>
                      <Text style={styles.price}>{formatMNT(p.unit_price)}</Text>
                    </Pressable>
                  );
                })
              )}
              {results.length > LIST_LIMIT ? (
                <Text style={styles.noResults}>+{results.length - LIST_LIMIT} бараа. Хайлтаар нарийсгана уу.</Text>
              ) : null}
            </Card>
          ) : null}

          {hasItems ? (
            <Card style={{ padding: 0 }}>
              {cartLines.map(({ product: p, qty }, i) => (
                <View key={p.id} style={[styles.cartRow, i > 0 && styles.divider]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productMeta}>{formatMNT(p.unit_price)} × {qty} = {formatMNT(Number(p.unit_price) * qty)}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => setQty(p, qty - 1)} style={styles.stepBtn} accessibilityLabel="Нэгээр хасах" hitSlop={4}>
                      <Feather name={qty <= 1 ? "x" : "minus"} size={18} color={colors.text} />
                    </Pressable>
                    <Text style={styles.stepQty}>{qty}</Text>
                    <Pressable onPress={() => setQty(p, qty + 1)} disabled={qty >= p.stock} style={[styles.stepBtn, qty >= p.stock && { opacity: 0.35 }]} accessibilityLabel="Нэгээр нэмэх" hitSlop={4}>
                      <Feather name="plus" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <>
              <Field label="Илгээмжийн тайлбар" hint="Бараа сонгоогүй үед бөглөнө" error={errors.package_description}>
                <Input value={values.package_description} onChangeText={set("package_description")} placeholder="Жишээ нь: Жижиг хайрцаг" maxLength={500} />
              </Field>
              <Field label="Барааны дүн (₮)" error={errors.amount_due}>
                <Input value={values.goods_amount} onChangeText={(v) => set("goods_amount")(digits(v))} keyboardType="number-pad" placeholder="0" />
              </Field>
            </>
          )}
          {errors.items ? <Text style={styles.error}>{errors.items}</Text> : null}
        </Section>

        <Section title="Төлбөр ба тэмдэглэл">
          <Field label="Хүргэлтийн төлбөр (₮)" hint="Нийт дүнд нэмэгдэнэ" error={errors.delivery_fee}>
            <Input value={values.delivery_fee} onChangeText={(v) => set("delivery_fee")(digits(v))} keyboardType="number-pad" placeholder="0" />
          </Field>
          <Field label="Тэмдэглэл" error={errors.notes}>
            <Input value={values.notes} onChangeText={set("notes")} multiline maxLength={1000} style={{ minHeight: 64 }} />
          </Field>
        </Section>

        {errors.form ? <ErrorBanner message={errors.form} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>
            {hasItems ? `${cartLines.length} бараа · ` : ""}Нийт
          </Text>
          <Text style={styles.total}>{formatMNT(total)}</Text>
        </View>
        <Button label="Захиалга үүсгэх" icon="check" size="lg" loading={busy} onPress={submit} style={{ flex: 1.4 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12, marginBottom: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      accessibilityLabel={props.placeholder}
      {...props}
      style={[styles.input, props.multiline && { textAlignVertical: "top", paddingTop: 12 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, width: "100%", maxWidth: 640, alignSelf: "center" },
  sectionTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.textSecondary },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  input: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.text,
  },
  search: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  searchInput: { flex: 1, minHeight: TOUCH, fontFamily: font.regular, fontSize: 16, color: colors.text },
  chips: { gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  chip: { height: 34, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.muted },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: font.medium, fontSize: 13, color: colors.text },
  noResults: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 16 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addBox: { width: 30, height: 30, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  addBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  addBoxText: { fontFamily: font.semibold, fontSize: 14, color: colors.white },
  productName: { fontFamily: font.medium, fontSize: 15, color: colors.text },
  productMeta: { fontFamily: font.regular, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  price: { fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stepQty: { minWidth: 28, textAlign: "center", fontFamily: font.semibold, fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalLabel: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },
  total: { fontFamily: font.bold, fontSize: 20, color: colors.text, fontVariant: ["tabular-nums"] },
});
