"use client";

import { KeyRoundIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, RefreshCwIcon } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/features/deliveries/actions";
import { createCourier, resetCourierPassword, setCourierActive, updateCourier } from "./actions";

export type CourierRef = { id: string; full_name: string; phone: string | null; is_active: boolean };

function generatePassword() {
  // Unambiguous characters, easy to read out over the phone.
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function useSubmit(onDone: () => void, success: string) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  function run(fn: () => Promise<ActionResult<unknown>>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        onDone();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }
  return { errors, setErrors, pending, run };
}

// ---------------- Create / edit ----------------

function CourierForm({ courier, onClose }: { courier?: CourierRef; onClose: () => void }) {
  const isEdit = Boolean(courier);
  const [values, setValues] = useState({
    full_name: courier?.full_name ?? "",
    phone: courier?.phone ?? "",
    email: "",
    password: isEdit ? "" : generatePassword(),
  });
  const { errors, pending, run } = useSubmit(onClose, isEdit ? "Хадгалагдлаа." : "Курьер нэмэгдлээ.");
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Курьер засах" : "Курьер нэмэх"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Нэр болон утасны дугаарыг шинэчилнэ."
            : "Курьер апп-д энэ и-мэйл, нууц үгээр нэвтэрнэ. Нууц үгийг курьерт өгнө үү."}
        </DialogDescription>
      </DialogHeader>
      <form
        id="courier-form"
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            isEdit
              ? updateCourier(courier!.id, { full_name: values.full_name, phone: values.phone })
              : createCourier(values),
          );
        }}
      >
        <Field id="full_name" label="Нэр" error={errors.full_name}>
          <Input id="full_name" value={values.full_name} onChange={set("full_name")} autoFocus />
        </Field>
        <Field id="phone" label="Утас" error={errors.phone}>
          <Input id="phone" value={values.phone} onChange={set("phone")} inputMode="tel" placeholder="9911 2233" />
        </Field>
        {!isEdit ? (
          <>
            <Field id="email" label="И-мэйл (нэвтрэх нэр)" error={errors.email}>
              <Input id="email" type="email" value={values.email} onChange={set("email")} autoComplete="off" />
            </Field>
            <Field id="password" label="Анхны нууц үг" error={errors.password}>
              <div className="flex gap-2">
                <Input id="password" value={values.password} onChange={set("password")} autoComplete="off" className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Шинэ нууц үг үүсгэх"
                  title="Шинэ нууц үг үүсгэх"
                  onClick={() => setValues((v) => ({ ...v, password: generatePassword() }))}
                >
                  <RefreshCwIcon />
                </Button>
              </div>
            </Field>
          </>
        ) : null}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button type="submit" form="courier-form" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Хадгалах" : "Нэмэх"}
        </Button>
      </DialogFooter>
    </>
  );
}

function ResetPasswordForm({ courier, onClose }: { courier: CourierRef; onClose: () => void }) {
  const [password, setPassword] = useState(generatePassword);
  const { errors, pending, run } = useSubmit(onClose, "Нууц үг солигдлоо.");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Нууц үг солих</DialogTitle>
        <DialogDescription>{courier.full_name}-ийн шинэ нууц үгийг курьерт өгнө үү.</DialogDescription>
      </DialogHeader>
      <form
        id="reset-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() => resetCourierPassword({ courierId: courier.id, password }));
        }}
      >
        <Field id="new-password" label="Шинэ нууц үг" error={errors.password}>
          <div className="flex gap-2">
            <Input id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" autoComplete="off" />
            <Button type="button" variant="outline" size="icon" aria-label="Шинэ нууц үг үүсгэх" onClick={() => setPassword(generatePassword())}>
              <RefreshCwIcon />
            </Button>
          </div>
        </Field>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button type="submit" form="reset-form" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Солих
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------- Public components ----------------

export function NewCourierButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="h-9" onClick={() => setOpen(true)}>
        <PlusIcon />
        Курьер нэмэх
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open ? <CourierForm onClose={() => setOpen(false)} /> : null}</DialogContent>
      </Dialog>
    </>
  );
}

type Mode = "edit" | "password" | "toggle" | null;

export function CourierActions({ courier, variant = "menu" }: { courier: CourierRef; variant?: "menu" | "buttons" }) {
  const [mode, setMode] = useState<Mode>(null);
  const [pending, startTransition] = useTransition();
  const close = () => setMode(null);

  function toggleActive() {
    startTransition(async () => {
      const result = await setCourierActive({ courierId: courier.id, active: !courier.is_active });
      if (result.ok) {
        toast.success(courier.is_active ? "Курьер идэвхгүй боллоо." : "Курьер идэвхжлээ.");
        close();
      } else {
        toast.error(result.error);
      }
    });
  }

  const toggleLabel = courier.is_active ? "Идэвхгүй болгох" : "Идэвхжүүлэх";

  return (
    <>
      {variant === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`${courier.full_name} үйлдэл`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setMode("edit")}>
              <PencilIcon />
              Засах
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setMode("password")}>
              <KeyRoundIcon />
              Нууц үг солих
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={courier.is_active ? "destructive" : "default"} onSelect={() => setMode("toggle")}>
              <PowerIcon />
              {toggleLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMode("toggle")} className={courier.is_active ? "text-destructive hover:text-destructive" : undefined}>
            <PowerIcon />
            {toggleLabel}
          </Button>
          <Button variant="outline" onClick={() => setMode("password")}>
            <KeyRoundIcon />
            Нууц үг солих
          </Button>
          <Button variant="outline" onClick={() => setMode("edit")}>
            <PencilIcon />
            Засах
          </Button>
        </div>
      )}

      <Dialog open={mode === "edit" || mode === "password"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          {mode === "edit" ? <CourierForm courier={courier} onClose={close} /> : null}
          {mode === "password" ? <ResetPasswordForm courier={courier} onClose={close} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={mode === "toggle"} onOpenChange={(o) => !o && !pending && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {courier.is_active
                ? `${courier.full_name} апп ашиглах, хүргэлт авах боломжгүй болно. Идэвхтэй хүргэлттэй бол эхлээд дахин хуваарилна уу.`
                : `${courier.full_name} дахин хүргэлт авах боломжтой болно.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                toggleActive();
              }}
              disabled={pending}
              variant={courier.is_active ? "destructive" : "default"}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {toggleLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CourierStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
      style={active ? { backgroundColor: "#16A34A1A", color: "#15803D" } : { backgroundColor: "#94A3B81A", color: "#475569" }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: active ? "#16A34A" : "#94A3B8" }} aria-hidden />
      {active ? "Идэвхтэй" : "Идэвхгүй"}
    </span>
  );
}
