import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { listPickerProducts } from "@/features/products/queries";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const admin = await getCurrentAdmin();
  const supabase = await createClient();
  const [{ count }, cookieStore, products] = await Promise.all([
    supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("status", "UNASSIGNED"),
    cookies(),
    listPickerProducts(),
  ]);

  return (
    <RealtimeProvider>
      <AppShell
        user={admin}
        unassignedCount={count ?? 0}
        products={products}
        defaultCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}
      >
        {children}
      </AppShell>
    </RealtimeProvider>
  );
}
