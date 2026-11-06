import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { emitDeliveriesChanged } from "@/lib/events";
import { useCourier } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { usePush } from "@/lib/use-push";
import { colors, font } from "@/theme";

function tabIcon(name: React.ComponentProps<typeof Feather>["name"]) {
  function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Feather name={name} size={size} color={typeof color === "string" ? color : colors.textSecondary} />;
  }
  return TabIcon;
}

/**
 * Live updates. RLS limits Realtime to rows the courier can see, so a delivery
 * taken away (reassign / unassign / cancel) never arrives as a deliveries
 * event — but the database writes a notification for it in the same
 * transaction, and the courier's own notifications are visible. Listen to both.
 */
function useRealtimeRefresh(courierId: string) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(emitDeliveriesChanged, 500);
    };
    const channel = supabase
      .channel(`courier-${courierId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, refresh)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${courierId}` },
        refresh,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [courierId]);
}

export default function TabsLayout() {
  const courier = useCourier();
  useRealtimeRefresh(courier.id);
  usePush(courier.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface, minHeight: 60 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Миний", tabBarIcon: tabIcon("truck") }}
      />
      <Tabs.Screen
        name="available"
        options={{ title: "Авах", tabBarIcon: tabIcon("inbox") }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "Түүх", tabBarIcon: tabIcon("clock") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Профайл", tabBarIcon: tabIcon("user") }}
      />
    </Tabs>
  );
}
