import { formatPhone } from "@delivery/shared";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Text, View } from "react-native";
import { TabScreen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Button, Card, KeyValue, text } from "@/components/ui";
import { useAuth, useCourier } from "@/lib/auth";
import { getPushStatus, registerForPush, type PushStatus } from "@/lib/push";
import { colors } from "@/theme";

const PUSH_LABEL: Record<PushStatus, string> = {
  enabled: "Идэвхтэй",
  denied: "Хаалттай",
  undetermined: "Идэвхгүй",
  unavailable: "Боломжгүй",
};

export default function ProfileScreen() {
  const courier = useCourier();
  const { session, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getPushStatus().then(setPush);
    }, []),
  );

  async function enablePush() {
    if (push === "denied") {
      // The OS won't ask again — only system settings can turn it back on.
      await Linking.openSettings();
      return;
    }
    setBusy(true);
    setPush(await registerForPush(courier.id));
    setBusy(false);
  }

  return (
    <TabScreen title="Профайл">
      <Card>
        <KeyValue label="Нэр" value={courier.full_name} />
        <KeyValue label="Утас" value={formatPhone(courier.phone) || "—"} />
        <KeyValue label="И-мэйл" value={session?.user.email ?? "—"} last />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <KeyValue
          label="Мэдэгдэл"
          value={
            <Text style={[text.bodyStrong, { color: push === "enabled" ? colors.success : colors.textSecondary }]}>
              {push ? PUSH_LABEL[push] : "…"}
            </Text>
          }
          last={push === "enabled" || push === "unavailable"}
        />
        {push === "denied" || push === "undetermined" ? (
          <View style={{ paddingTop: 12, gap: 10 }}>
            <Text style={text.secondary}>
              Шинэ хүргэлт оноогдох, хасагдах үед мэдэгдэл авахын тулд идэвхжүүлнэ үү.
            </Text>
            <Button
              label={push === "denied" ? "Тохиргоо нээх" : "Мэдэгдэл идэвхжүүлэх"}
              icon="bell"
              variant="secondary"
              loading={busy}
              onPress={enablePush}
            />
          </View>
        ) : null}
        {push === "unavailable" ? (
          <Text style={[text.secondary, { paddingTop: 8 }]}>
            Энэ төхөөрөмж дээр push мэдэгдэл ажиллахгүй. Жагсаалт автоматаар шинэчлэгдэнэ.
          </Text>
        ) : null}
      </Card>

      <Button label="Гарах" icon="log-out" variant="danger" onPress={() => setConfirm(true)} style={{ marginTop: 24 }} />

      <View style={{ alignItems: "center", marginTop: 24 }}>
        <Text style={text.secondary}>Хувилбар {Constants.expoConfig?.version ?? "—"}</Text>
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Гарах уу?" description="Дахин нэвтрэхэд и-мэйл, нууц үг шаардлагатай.">
        <Button label="Гарах" variant="danger" size="lg" onPress={() => void signOut()} />
        <Button label="Болих" variant="secondary" size="lg" onPress={() => setConfirm(false)} />
      </Sheet>
    </TabScreen>
  );
}
