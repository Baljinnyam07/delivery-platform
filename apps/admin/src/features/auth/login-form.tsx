"use client";

import { Loader2Icon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {
    error: initialError,
  });

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">И-мэйл</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          placeholder="admin@company.mn"
          required
          autoFocus
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-[#ff8ba7]">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Нэвтрэх
      </Button>
    </form>
  );
}
