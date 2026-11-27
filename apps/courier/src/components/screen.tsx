import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { text } from "./ui";

/** Tab screen: large title, pull-to-refresh, centered column on wide screens. */
export function TabScreen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Shown to the right of the title (e.g. a primary button). */
  action?: ReactNode;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={text.h1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[text.secondary, { marginTop: 4 }]}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32, width: "100%", maxWidth: 640, alignSelf: "center" },
  header: { paddingTop: 8, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
});
