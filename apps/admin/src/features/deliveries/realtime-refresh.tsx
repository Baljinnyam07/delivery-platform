"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Re-renders server data when deliveries change anywhere (couriers claim,
 * start, complete…). RLS applies to Realtime, so only rows the admin may
 * see are delivered. Changes are batched to one refresh per second.
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel("admin-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 1000);
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
