"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEvento } from "../actions";

interface Props {
  eventoId: string;
  eventoNome: string;
}

export function DeleteButton({ eventoId, eventoNome }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const ok = window.confirm(
      `Tem certeza que deseja excluir "${eventoNome}"? Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteEvento(eventoId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        onClick={handleClick}
        disabled={isPending}
      >
        <Trash2 />
        {isPending ? "Excluindo..." : "Excluir"}
      </Button>
      {error && (
        <p className="max-w-xs text-right text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
