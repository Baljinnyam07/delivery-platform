import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/** Must match ANDROID_CHANNEL_ID in supabase/functions/send-push. */
export const CHANNEL_ID = "deliveries";

export type PushStatus =
  | "enabled"
  | "denied" // user said no — only system settings can change it
  | "undetermined"
  | "unavailable"; // web, Expo Go (no remote push since SDK 53), or no EAS project id

// Show notifications while the app is open too.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  // Android 13+: the channel must exist before requesting a token.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Хүргэлт",
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563EB",
  });
}

export async function getPushStatus(): Promise<PushStatus> {
  if (Platform.OS === "web" || !projectId()) return "unavailable";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "enabled" : status === "denied" ? "denied" : "undetermined";
}

/**
 * Asks for permission (if needed), gets the Expo push token and stores it
 * on the courier's profile. Never throws: push is a convenience, the app
 * works fully without it (lists also update through Realtime).
 */
export async function registerForPush(userId: string, { ask = true } = {}): Promise<PushStatus> {
  try {
    const id = projectId();
    if (Platform.OS === "web" || !id) return "unavailable";

    await ensureChannel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted" && ask) ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return status === "denied" ? "denied" : "undetermined";

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    // Only this column is writable by the courier (column grant).
    await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
    return "enabled";
  } catch {
    return "unavailable";
  }
}

/** Called before sign-out so a logged-out phone stops receiving pushes. */
export async function unregisterPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    await supabase.from("profiles").update({ expo_push_token: null }).eq("id", userId);
  } catch {
    // best effort — the server also clears tokens Expo reports as unregistered
  }
}
