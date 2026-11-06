import { Feather } from "@expo/vector-icons";
import type { ErrorBoundaryProps } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font } from "@/theme";
import { Button } from "./ui";

/** Shown instead of a white screen when a route crashes while rendering. */
export function ErrorScreen({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <View style={styles.icon}>
          <Feather name="alert-triangle" size={26} color={colors.danger} />
        </View>
        <Text style={styles.title}>Алдаа гарлаа</Text>
        <Text style={styles.body}>Интернэт холболтоо шалгаад дахин оролдоно уу.</Text>
        <Button label="Дахин оролдох" icon="refresh-cw" size="lg" onPress={() => void retry()} style={{ alignSelf: "stretch", marginTop: 8 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "center" },
  box: { alignItems: "center", gap: 10, padding: 24, width: "100%", maxWidth: 420, alignSelf: "center" },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontFamily: font.semibold, fontSize: 19, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 21 },
});
