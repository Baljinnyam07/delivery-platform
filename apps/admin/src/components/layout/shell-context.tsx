"use client";

import { createContext, useContext } from "react";

export type ShellActions = {
  openCommand: () => void;
  openNewDelivery: () => void;
};

export const ShellContext = createContext<ShellActions | null>(null);

export function useShell(): ShellActions {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
