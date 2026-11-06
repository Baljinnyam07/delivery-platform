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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandMark className="size-10" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Админ нэвтрэх</h1>
            <p className="text-sm text-muted-foreground">Хүргэлтийн удирдлагын систем</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <LoginForm initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
