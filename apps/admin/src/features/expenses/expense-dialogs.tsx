"use client";

import { formatMNT, todayInUlaanbaatar } from "@delivery/shared";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createExpense, voidExpense } from "./actions";

type Factory = { id: string; name: string };
const SHARED = "SHARED";

// ---------------- Add ----------------

function ExpenseForm({ factories, onClose }: { factories: Factory[]; onClose: () => void }) {
  const [id] = useState(() => crypto.randomUUID()); // idempotent double submit
  const [spentOn, setSpentOn] = useState(todayInUlaanbaatar());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<string>(SHARED);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const value = Number(amount.replace(/[\s,]/g, ""));
  const n = factories.length;
  const share = target === SHARED && n > 0 && value > 0 ? Math.floor(value / n) : null;

  function submit() {
    startTransition(async () => {
      const result = await createExpense({
        id,
        spent_on: spentOn,
        amount: amount.replace(/[\s,]/g, ""),
        description,
        factory_id: target === SHARED ? null : target,
      });
      if (result.ok) {
        toast.success("Зардал бүртгэгдлээ.");
        onClose();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Зардал нэмэх</DialogTitle>
        <DialogDescription>Брэндийн тайланд зардлаар бүртгэгдэж, цэвэр үлдэгдлээс хасагдана.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Аль брэндийн зардал</Label>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {[...factories.map((f) => ({ id: f.id, label: f.name })), { id: SHARED, label: "Хуваах" }].map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={target === o.id}
                onClick={() => setTarget(o.id)}
                className={cn(
                  "h-10 truncate rounded-lg border px-2 text-sm font-medium transition-colors",
                  target === o.id ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {target === SHARED ? (
            <p className="text-xs text-muted-foreground">
              {share != null
                ? `${factories.map((f, i) => `${f.name} ${formatMNT(share + (i === 0 ? value - share * n : 0))}`).join(" · ")}`
                : `${n} брэндэд тэнцүү хуваагдана.`}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="exp-amount">Дүн (₮)</Label>
            <Input
              id="exp-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              className="tabular"
            />
            {errors.amount ? <p className="text-sm text-destructive">{errors.amount}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-date">Огноо</Label>
            <Input
              id="exp-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              aria-invalid={Boolean(errors.spent_on)}
            />
            {errors.spent_on ? <p className="text-sm text-destructive">{errors.spent_on}</p> : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-desc">Тайлбар</Label>
          <Input
            id="exp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="Жишээ нь: Шатахуун, Түрээс"
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Бүртгэх
        </Button>
      </DialogFooter>
    </>
  );
}

export function AddExpenseButton({ factories }: { factories: Factory[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Зардал нэмэх
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open ? <ExpenseForm factories={factories} onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------- Delete ----------------

export function DeleteExpenseButton({ expense }: { expense: { id: string; description: string; amount: number } }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await voidExpense(expense.id);
      if (result.ok) {
        toast.success("Зардал устгагдлаа.");
        setOpen(false);
      } else toast.error(result.error);
    });
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label={`${expense.description} зардлыг устгах`}
      >
        <Trash2Icon className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Зардал устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              “{expense.description}” · {formatMNT(expense.amount)} тайлангаас хасагдана. Бүртгэл түүхэнд хадгалагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
