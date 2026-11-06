"use client";

import { LogOutIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon, SearchIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AvatarInitial } from "@/components/ui/avatar-initial";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DeliveryFormSheet } from "@/features/deliveries/components/delivery-form-sheet";
import { useLiveStatus } from "@/features/realtime/realtime-provider";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";
import { CommandMenu } from "./command-menu";
import { Nav } from "./nav";
import { NAV_ITEMS, SIDEBAR_COOKIE } from "./nav-config";
import { ShellContext } from "./shell-context";

type Props = {
  user: { fullName: string; email: string | null };
  unassignedCount: number;
  defaultCollapsed: boolean;
  children: ReactNode;
};

const noopSubscribe = () => () => {};

/** True when a keystroke belongs to a text field or an open dialog, not to global shortcuts. */
function isTypingTarget(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return true;
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]'));
}

function Sidebar({
  user,
  unassignedCount,
  collapsed,
  onToggle,
  onNavigate,
}: {
  user: Props["user"];
  unassignedCount: number;
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2.5", collapsed ? "justify-center px-0" : "px-4")}>
        <BrandMark className="size-7" />
        {collapsed ? null : (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-display text-[15px] font-bold">Хүргэлт</p>
            <p className="text-[11px] text-muted-foreground">Удирдлагын систем</p>
          </div>
        )}
        {onToggle && !collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Цэсийг хураах"
            title="Цэсийг хураах  ["
            className="text-muted-foreground"
          >
            <PanelLeftCloseIcon />
          </Button>
        ) : null}
      </div>

      <div className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}>
        <Nav unassignedCount={unassignedCount} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className={cn("border-t", collapsed ? "space-y-1 p-2" : "p-3")}>
        {onToggle && collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Цэсийг дэлгэх"
            title="Цэсийг дэлгэх  ["
            className="w-full text-muted-foreground"
          >
            <PanelLeftOpenIcon />
          </Button>
        ) : null}
        <div className={cn("flex items-center gap-2.5 rounded-lg", collapsed ? "flex-col" : "px-1.5 py-1")}>
          <span title={collapsed ? user.fullName : undefined}>
            <AvatarInitial name={user.fullName} />
          </span>
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{user.fullName}</p>
              {user.email ? <p className="truncate text-[11px] text-muted-foreground">{user.email}</p> : null}
            </div>
          )}
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Гарах"
              title="Гарах"
              className="text-muted-foreground"
            >
              <LogOutIcon />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LiveIndicator() {
  const status = useLiveStatus();
  const label = status === "live" ? "Шууд" : status === "connecting" ? "Холбогдож байна" : "Холболт салсан";
  return (
    <span
      className="hidden items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex"
      title={status === "live" ? "Өөрчлөлт бодит цагт шинэчлэгдэж байна" : label}
      role="status"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "live" && "animate-live bg-neon-green",
          status === "connecting" && "animate-pulse bg-status-in-progress",
          status === "offline" && "bg-status-cancelled",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function AppShell({ user, unassignedCount, defaultCollapsed, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [commandOpen, setCommandOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  // "Ctrl" on the server and non-Apple clients, "⌘" on Apple — no hydration mismatch.
  const modKey = useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  // Global keyboard shortcuts: ⌘K / Ctrl+K, "/", N, "[", and "G then X" navigation.
  useEffect(() => {
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | undefined;

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e)) return;

      const key = e.key.toLowerCase();
      if (gPending) {
        gPending = false;
        clearTimeout(gTimer);
        const target = NAV_ITEMS.find((n) => n.key === key);
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (key === "g") {
        gPending = true;
        gTimer = setTimeout(() => (gPending = false), 900);
      } else if (key === "n") {
        e.preventDefault();
        setNewOpen(true);
      } else if (key === "/") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (key === "[") {
        toggleCollapsed();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(gTimer);
    };
  }, [router, toggleCollapsed]);

  const shell = useMemo(
    () => ({ openCommand: () => setCommandOpen(true), openNewDelivery: () => setNewOpen(true) }),
    [],
  );

  return (
    <ShellContext value={shell}>
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-(--dur-base) ease-(--ease-out)",
          collapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-(--dur-base) ease-(--ease-out) lg:block",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <Sidebar
            user={user}
            unassignedCount={unassignedCount}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
          />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            <SheetTitle className="sr-only">Цэс</SheetTitle>
            <Sidebar
              user={user}
              unassignedCount={unassignedCount}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1.5 lg:hidden"
              aria-label="Цэс нээх"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </Button>
            <BrandMark className="size-7 lg:hidden" />

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group ml-auto flex h-9 items-center gap-2.5 rounded-lg border bg-card px-3 text-sm text-subtle-foreground transition-colors duration-(--dur-fast) hover:border-white/20 hover:text-muted-foreground sm:ml-0 sm:w-full sm:max-w-sm"
              aria-label="Хайх"
            >
              <SearchIcon className="size-4 shrink-0" />
              <span className="hidden flex-1 truncate text-left sm:block">Хүргэлт, захиалагч, курьер хайх…</span>
              <span className="hidden items-center gap-0.5 sm:flex" aria-hidden>
                <kbd className="kbd">{modKey}</kbd>
                <kbd className="kbd">K</kbd>
              </span>
            </button>

            <div className="flex items-center gap-2 sm:ml-auto">
              <LiveIndicator />
              <Button onClick={() => setNewOpen(true)} className="h-9 gap-2 pr-2 pl-3 max-sm:size-9 max-sm:p-0">
                <PlusIcon />
                <span className="max-sm:sr-only">Шинэ хүргэлт</span>
                <kbd className="kbd border-primary-foreground/25 text-primary-foreground/70 max-sm:hidden">N</kbd>
              </Button>
            </div>
          </div>
        </header>

        <main
          key={pathname}
          className="mx-auto w-full max-w-[1400px] animate-enter px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onNewDelivery={() => setNewOpen(true)} />
      <DeliveryFormSheet open={newOpen} onOpenChange={setNewOpen} />
    </ShellContext>
  );
}
