import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, shadow } from "@/theme";

type Tone = "success" | "error";
type Toast = { message: string; tone: Tone } | null;

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Short, non-blocking feedback banner (works the same on native and web). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = "success") => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
          <View
            accessibilityRole="alert"
            style={[styles.toast, { borderLeftColor: toast.tone === "success" ? colors.success : colors.danger }]}
          >
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext>
  );
}

export function useToast() {
  return use(ToastContext);
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  toast: {
    maxWidth: 480,
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  text: { fontFamily: font.medium, fontSize: 15, color: colors.text },
});
