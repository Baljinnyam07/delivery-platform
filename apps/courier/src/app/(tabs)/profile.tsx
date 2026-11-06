import { formatPhone } from "@delivery/shared";
import Constants from "expo-constants";
import { useState } from "react";
import { Text, View } from "react-native";
import { TabScreen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Button, Card, KeyValue, text } from "@/components/ui";
import { useAuth, useCourier } from "@/lib/auth";

export default function ProfileScreen() {
  const courier = useCourier();
  const { session, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);

  return (
    <TabScreen title="Профайл">
      <Card>
        <KeyValue label="Нэр" value={courier.full_name} />
        <KeyValue label="Утас" value={formatPhone(courier.phone) || "—"} />
        <KeyValue label="И-мэйл" value={session?.user.email ?? "—"} last />
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
