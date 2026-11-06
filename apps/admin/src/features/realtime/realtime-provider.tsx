"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

export type LiveStatus = "connecting" | "live" | "offline";

const LiveStatusContext = createContext<LiveStatus>("connecting");

export const useLiveStatus = () => useContext(LiveStatusContext);

/**
 * Re-renders server data when deliveries change anywhere (couriers claim,
 * start, complete…) and exposes the connection state for the "live" dot.
 * RLS applies to Realtime, so only rows the admin may see are delivered.
 * Changes are batched to one refresh per second.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel("admin-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 1000);
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("offline");
      });

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return <LiveStatusContext value={status}>{children}</LiveStatusContext>;
}
