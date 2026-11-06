"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangleIcon className="size-6 text-destructive" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Алдаа гарлаа</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Мэдээллийг ачаалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу. Асуудал давтагдвал доорх кодыг
          хариуцсан хүнд өгнө үү.
        </p>
        {digest ? <p className="tabular text-xs text-muted-foreground">Код: {digest}</p> : null}
      </div>
      <Button onClick={() => retry()}>
        <RotateCwIcon />
        Дахин оролдох
      </Button>
    </div>
  );
}
