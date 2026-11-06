import { Stack, router } from "expo-router";
import { View } from "react-native";
import { Button, EmptyState } from "@/components/ui";
import { colors } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center" }}>
        <EmptyState icon="compass" title="Хуудас олдсонгүй" />
        <Button label="Нүүр рүү буцах" variant="secondary" onPress={() => router.replace("/")} />
      </View>
    </>
  );
}
