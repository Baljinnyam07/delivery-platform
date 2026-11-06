import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchXIcon className="size-6 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Хуудас олдсонгүй</h1>
        <p className="text-sm text-muted-foreground">Хайсан хуудас, хүргэлт эсвэл курьер байхгүй байна.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Нүүр хуудас руу буцах</Link>
      </Button>
    </main>
  );
}
