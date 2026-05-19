"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateEvento } from "../actions";

interface Props {
  eventoId: string;
}

export function DuplicateButton({ eventoId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await duplicateEvento(eventoId);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
    >
      <Copy />
      {isPending ? "Duplicando..." : "Duplicar"}
    </Button>
  );
}
