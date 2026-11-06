import { Linking } from "react-native";

/**
 * Google Maps directions link. Opens the Google Maps app when installed,
 * otherwise the browser. No Maps SDK / API key needed (MVP: no live GPS).
 */
export function mapsUrl(d: { address: string; latitude?: number | null; longitude?: number | null }) {
  const destination =
    d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : d.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function openMaps(d: Parameters<typeof mapsUrl>[0]) {
  return Linking.openURL(mapsUrl(d));
}

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`);
}
