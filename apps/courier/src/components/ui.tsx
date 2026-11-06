import { Feather } from "@expo/vector-icons";
import { DELIVERY_STATUS_META, PAYMENT_STATUS_META, type DeliveryStatus, type PaymentStatus } from "@delivery/shared";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, radius, shadow, statusColor, statusText, TOUCH } from "@/theme";

type IconName = ComponentProps<typeof Feather>["name"];

// ---------------- Button ----------------

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = "primary", size = "md", icon, loading, disabled, style, accessibilityHint }: ButtonProps) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { minHeight: size === "lg" ? 56 : TOUCH, backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={size === "lg" ? 20 : 18} color={v.fg} /> : null}
          <Text style={[styles.buttonText, { color: v.fg, fontSize: size === "lg" ? 17 : 15 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.surface, pressed: colors.muted, fg: colors.text, border: colors.border },
  danger: { bg: colors.surface, pressed: colors.dangerSoft, fg: colors.danger, border: colors.border },
  ghost: { bg: "transparent", pressed: colors.muted, fg: colors.primary, border: "transparent" },
} as const;

// ---------------- Badges ----------------

function Pill({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return <Pill label={DELIVERY_STATUS_META[status].label} color={statusColor[status] ?? colors.textSecondary} text={statusText[status] ?? colors.text} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Pill label={PAYMENT_STATUS_META[status].label} color={statusColor[status] ?? colors.textSecondary} text={statusText[status] ?? colors.text} />;
}

// ---------------- Layout ----------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {count != null ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={22} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Feather name="wifi-off" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button label="Дахин" variant="ghost" onPress={onRetry} style={{ minHeight: 36, paddingHorizontal: 8 }} /> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function KeyValue({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.kv, !last && styles.kvBorder]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.kvValue}>{value}</Text>
      ) : (
        <View style={{ flex: 1, alignItems: "flex-end" }}>{value}</View>
      )}
    </View>
  );
}

export const text = StyleSheet.create({
  h1: { fontFamily: font.bold, fontSize: 26, color: colors.text, letterSpacing: -0.4 },
  h2: { fontFamily: font.semibold, fontSize: 18, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  secondary: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  code: { fontFamily: font.semibold, fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] },
  amount: { fontFamily: font.semibold, fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  buttonText: { fontFamily: font.semibold },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: 10, height: 26 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: font.medium, fontSize: 12.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadow },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 10 },
  sectionTitleText: { fontFamily: font.semibold, fontSize: 13, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  sectionCount: { fontFamily: font.semibold, fontSize: 12, color: colors.textSecondary, backgroundColor: colors.muted, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  empty: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.text, textAlign: "center" },
  emptyBody: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  error: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.danger },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 12 },
  kvBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  kvLabel: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
  kvValue: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text, textAlign: "right" },
});
