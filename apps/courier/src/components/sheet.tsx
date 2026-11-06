import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius } from "@/theme";

/**
 * Bottom sheet built on RN Modal. Used instead of Alert.alert so the same
 * confirmations work on Android, iOS and the web preview, in our design.
 */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  busy?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {
        if (!busy) onClose();
      }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <Pressable style={styles.backdrop} onPress={() => !busy && onClose()} accessibilityLabel="Хаах" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={{ marginTop: 16, gap: 12 }}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontFamily: font.semibold, fontSize: 19, color: colors.text },
  description: { fontFamily: font.regular, fontSize: 14.5, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
});
