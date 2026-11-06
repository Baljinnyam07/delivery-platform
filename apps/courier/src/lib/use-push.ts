import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { emitDeliveriesChanged } from "./events";
import { registerForPush } from "./push";

type PushData = { type?: string; deliveryId?: string | null };

function openFromNotification(data: PushData) {
  if (data.type === "DELIVERY_ASSIGNED" && data.deliveryId) {
    router.push({ pathname: "/delivery/[id]", params: { id: data.deliveryId } });
  } else if (data.type === "DELIVERY_AVAILABLE") {
    router.push("/available");
  } else {
    // Removed / cancelled: the delivery is no longer visible — show the list.
    router.push("/");
  }
}

/**
 * Registers the push token after sign-in and routes notification taps.
 * Mounted once inside the signed-in tab layout.
 */
export function usePush(userId: string) {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    void registerForPush(userId);
  }, [userId]);

  // Tap on a notification (also covers a cold start from a notification).
  useEffect(() => {
    if (Platform.OS === "web" || !lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    openFromNotification((lastResponse.notification.request.content.data ?? {}) as PushData);
    Notifications.clearLastNotificationResponse();
  }, [lastResponse]);

  // A push arriving while the app is open: refresh lists right away.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationReceivedListener(() => emitDeliveriesChanged());
    return () => sub.remove();
  }, []);
}
