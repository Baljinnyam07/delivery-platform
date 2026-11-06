import { BarChart3Icon, LayoutDashboardIcon, PackageIcon, UsersIcon, WalletIcon, type LucideIcon } from "lucide-react";

/** Cookie that remembers the collapsed desktop sidebar (read on the server to avoid a layout jump). */
export const SIDEBAR_COOKIE = "sidebar_collapsed";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Second key of the "G then X" shortcut. */
  key: string;
  badge?: "unassigned";
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Ажил",
    items: [
      { href: "/", label: "Хянах самбар", icon: LayoutDashboardIcon, key: "h" },
      { href: "/deliveries", label: "Хүргэлтүүд", icon: PackageIcon, key: "d", badge: "unassigned" },
      { href: "/couriers", label: "Курьерууд", icon: UsersIcon, key: "c" },
    ],
  },
  {
    label: "Санхүү",
    items: [
      { href: "/payments", label: "Төлбөр", icon: WalletIcon, key: "p" },
      { href: "/reports", label: "Тайлан", icon: BarChart3Icon, key: "r" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
