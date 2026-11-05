"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeliveryFormSheet } from "./delivery-form-sheet";

export function NewDeliveryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-9">
        <PlusIcon />
        Шинэ хүргэлт
      </Button>
      <DeliveryFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
