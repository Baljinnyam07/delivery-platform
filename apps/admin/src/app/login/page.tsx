import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  // Already signed in as an admin → straight to the app.
  if (!error) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.claims.sub)
        .maybeSingle();
      if (profile?.role === "ADMIN" && profile.is_active) redirect("/");
    }
  }
  const initialError =
    error === "forbidden" ? "Зөвхөн админ эрхтэй хэрэглэгч нэвтрэх боломжтой." : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* One soft glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #00e5ff1f 0%, #ff2bd60f 45%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm animate-enter">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandMark className="size-11 rounded-xl" />
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold">Админ нэвтрэх</h1>
            <p className="text-sm text-muted-foreground">Хүргэлтийн удирдлагын систем</p>
          </div>
        </div>

        <div className="relative rounded-2xl neon-panel p-6">
          <span
            aria-hidden
            className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,#00e5ff99,transparent)]"
          />
          <LoginForm initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
