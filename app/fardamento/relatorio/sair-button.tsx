"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { sairRelatorio } from "./actions";

export function SairButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await sairRelatorio();
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      <LogOut className="size-4" />
      Sair
    </button>
  );
}
