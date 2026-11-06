import { Feather } from "@expo/vector-icons";
import { loginSchema } from "@delivery/shared";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, font, radius, TOUCH } from "@/theme";

export default function LoginScreen() {
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const shownError = error ?? notice;

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу.");
      return;
    }
    setBusy(true);
    setError(await signIn(parsed.data.email, parsed.data.password));
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Feather name="package" size={26} color={colors.white} />
            </View>
            <Text style={styles.title}>Курьер нэвтрэх</Text>
            <Text style={styles.subtitle}>Админаас авсан и-мэйл, нууц үгээ оруулна уу.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>И-мэйл</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              placeholder="name@example.com"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              accessibilityLabel="И-мэйл"
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Нууц үг</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={submit}
              accessibilityLabel="Нууц үг"
            />

            {shownError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {shownError}
              </Text>
            ) : null}

            <Button label="Нэвтрэх" size="lg" onPress={submit} loading={busy} style={{ marginTop: 24 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, maxWidth: 480, width: "100%", alignSelf: "center" },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: { width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontFamily: font.bold, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  form: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 20 },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.text, marginBottom: 8 },
  input: {
    minHeight: TOUCH + 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: { fontFamily: font.medium, fontSize: 14, color: colors.danger, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginTop: 16 },
});
