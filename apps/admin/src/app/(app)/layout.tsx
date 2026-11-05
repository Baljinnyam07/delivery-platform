import { AppShell } from "@/components/layout/app-shell";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/features/deliveries/realtime-refresh";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const admin = await getCurrentAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("status", "UNASSIGNED");

  return (
    <AppShell user={admin} unassignedCount={count ?? 0}>
      <RealtimeRefresh />
      {children}
    </AppShell>
  );
}
