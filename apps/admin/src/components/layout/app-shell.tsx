"use client";

import { LogOutIcon, MenuIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "./brand";
import { Nav } from "./nav";

type Props = {
  user: { fullName: string; email: string | null };
  unassignedCount: number;
  children: ReactNode;
};

function SidebarContent({ user, unassignedCount, onNavigate }: Omit<Props, "children"> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight">Хүргэлт</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Nav unassignedCount={unassignedCount} onNavigate={onNavigate} />
      </div>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {user.fullName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            {user.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="icon" aria-label="Гарах" title="Гарах">
              <LogOutIcon />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, unassignedCount, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
        <SidebarContent user={user} unassignedCount={unassignedCount} />
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Цэс нээх">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Цэс</SheetTitle>
            <SidebarContent user={user} unassignedCount={unassignedCount} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <BrandMark className="size-7" />
        <span className="text-sm font-semibold">Хүргэлт</span>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
