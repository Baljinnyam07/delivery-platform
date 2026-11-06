"use client";

import { Command } from "cmdk";
import {
  ArrowRightIcon,
  CircleDashedIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DeliveryStatusBadge } from "@/features/deliveries/components/status-badge";
import { searchEverything, type SearchResults } from "@/features/search/actions";
import { NAV_ITEMS } from "./nav-config";

type Shortcut = { label: string; icon: LucideIcon; keys?: string[]; run: () => void };

const EMPTY: SearchResults = { deliveries: [], couriers: [] };

function matches(label: string, q: string) {
  return label.toLowerCase().includes(q.trim().toLowerCase());
}

export function CommandMenu({
  open,
  onOpenChange,
  onNewDelivery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewDelivery: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[16vh] translate-y-0 gap-0 overflow-hidden p-0 shadow-raised sm:max-w-[600px] data-open:slide-in-from-top-2"
      >
        <DialogTitle className="sr-only">Хайлт ба командууд</DialogTitle>
        <DialogDescription className="sr-only">Хүргэлт, захиалагч, курьер хайх эсвэл үйлдэл сонгох</DialogDescription>
        {/* Content unmounts on close, so every open starts with a fresh query. */}
        <CommandBody onClose={() => onOpenChange(false)} onNewDelivery={onNewDelivery} />
      </DialogContent>
    </Dialog>
  );
}

function CommandBody({ onClose, onNewDelivery }: { onClose: () => void; onNewDelivery: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Debounced server search; stale responses are dropped.
  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    const id = ++requestId.current;
    const q = value.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await searchEverything(q);
        if (id === requestId.current) setResults(data);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 180);
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const actions: Shortcut[] = [
    {
      label: "Шинэ хүргэлт",
      icon: PlusIcon,
      keys: ["N"],
      run: () => {
        onClose();
        onNewDelivery();
      },
    },
    { label: "Хуваарилаагүй хүргэлтүүд", icon: CircleDashedIcon, run: () => go("/deliveries?status=UNASSIGNED") },
    { label: "Төлбөр аваагүй хүргэлтүүд", icon: WalletIcon, run: () => go("/deliveries?payment=UNPAID") },
  ];
  const pages: Shortcut[] = NAV_ITEMS.map((n) => ({
    label: n.label,
    icon: n.icon,
    keys: ["G", n.key.toUpperCase()],
    run: () => go(n.href),
  }));

  const q = query.trim();
  const visibleActions = q ? actions.filter((a) => matches(a.label, q)) : actions;
  const visiblePages = q ? pages.filter((p) => matches(p.label, q)) : pages;
  const hasResults =
    visibleActions.length + visiblePages.length + results.deliveries.length + results.couriers.length > 0;

  return (
        <Command shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-3 border-b px-4">
            {loading ? (
              <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <Command.Input
              value={query}
              onValueChange={onQueryChange}
              placeholder="Код, нэр, утас, хаяг эсвэл курьер…"
              className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle-foreground"
            />
            <kbd className="kbd">Esc</kbd>
          </div>

          <Command.List className="max-h-[min(440px,60vh)] scroll-py-2 overflow-y-auto p-2">
            {!hasResults && !loading ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                “{q}” гэсэн илэрц олдсонгүй.
              </div>
            ) : null}

            {results.deliveries.length > 0 ? (
              <Group heading="Хүргэлтүүд">
                {results.deliveries.map((d) => (
                  <Item key={d.id} value={`d-${d.id}`} onSelect={() => go(`/deliveries/${d.id}`)}>
                    <PackageIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="tabular w-[4.5rem] shrink-0 text-[13px] font-medium">{d.code}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {d.customer_name}
                      <span className="text-muted-foreground"> · {d.address}</span>
                    </span>
                    <DeliveryStatusBadge status={d.status} />
                  </Item>
                ))}
              </Group>
            ) : null}

            {results.couriers.length > 0 ? (
              <Group heading="Курьерууд">
                {results.couriers.map((c) => (
                  <Item key={c.id} value={`c-${c.id}`} onSelect={() => go(`/couriers/${c.id}`)}>
                    <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{c.full_name}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {c.phone ?? ""}
                      {c.is_active ? "" : " · идэвхгүй"}
                    </span>
                  </Item>
                ))}
              </Group>
            ) : null}

            {visibleActions.length > 0 ? (
              <Group heading="Үйлдэл">
                {visibleActions.map((a) => (
                  <ShortcutItem key={a.label} item={a} />
                ))}
              </Group>
            ) : null}

            {visiblePages.length > 0 ? (
              <Group heading="Хуудас">
                {visiblePages.map((p) => (
                  <ShortcutItem key={p.label} item={p} />
                ))}
              </Group>
            ) : null}
          </Command.List>

          <div className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd> сонгох
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd">Enter</kbd> нээх
            </span>
            <span className="ml-auto">2+ үсэг бичиж хайна</span>
          </div>
        </Command>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle-foreground"
    >
      {children}
    </Command.Group>
  );
}

function Item({ value, onSelect, children }: { value: string; onSelect: () => void; children: ReactNode }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group/item flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-(--dur-fast) select-none data-[selected=true]:bg-muted"
    >
      {children}
    </Command.Item>
  );
}

function ShortcutItem({ item }: { item: Shortcut }) {
  const Icon = item.icon;
  return (
    <Item value={item.label} onSelect={item.run}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">{item.label}</span>
      {item.keys ? (
        <span className="flex items-center gap-0.5 text-muted-foreground">
          {item.keys.map((k) => (
            <kbd key={k} className="kbd">
              {k}
            </kbd>
          ))}
        </span>
      ) : (
        <ArrowRightIcon className="size-3.5 text-muted-foreground opacity-0 group-data-[selected=true]/item:opacity-100" />
      )}
    </Item>
  );
}
