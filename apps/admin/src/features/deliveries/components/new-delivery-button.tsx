"use client";

import { PlusIcon } from "lucide-react";
import { useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";

/** Opens the shell's single "new delivery" sheet (same one as the N shortcut). */
export function NewDeliveryButton() {
  const { openNewDelivery } = useShell();
  return (
    <Button onClick={openNewDelivery} className="h-9">
      <PlusIcon />
      Шинэ хүргэлт
    </Button>
  );
}
