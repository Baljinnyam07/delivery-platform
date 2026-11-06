import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { onDeliveriesChanged } from "./events";

/**
 * Minimal data hook: loads on focus, on pull-to-refresh and whenever
 * deliveries change. Keeps the last good data while refetching.
 */
export function useQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async (mode: "silent" | "pull" = "silent") => {
    if (mode === "pull") setRefreshing(true);
    try {
      setData(await fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      if (mode === "pull") setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => onDeliveriesChanged(() => void load()), [load]);

  return {
    data,
    error,
    loading: data === undefined && error === null,
    refreshing,
    refresh: () => load("pull"),
    reload: () => load(),
  };
}
