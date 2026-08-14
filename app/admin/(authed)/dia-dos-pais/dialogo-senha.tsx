"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Pede a senha antes de apagar um card.
 *
 * Segue o mesmo desenho do gate de excluir evento, mas quem confere a
 * senha é a server action — aqui só coletamos. Assim o botão não é a
 * única proteção.
 */
export function DialogoSenha({
  titulo,
  descricao,
  aberto,
  ocupado,
  erro,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  descricao: string;
  aberto: boolean;
  ocupado: boolean;
  erro: string | null;
  onCancelar: () => void;
  onConfirmar: (senha: string) => void;
}) {
  const [senha, setSenha] = useState("");

  if (!aberto) return null;

  function fechar() {
    setSenha("");
    onCancelar();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-amadeus-blue">
            <Lock className="size-5" />
            {titulo}
          </h3>
          <button
            type="button"
            onClick={fechar}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="senha-card">Senha</Label>
          <Input
            id="senha-card"
            type="password"
            value={senha}
            autoFocus
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && senha) onConfirmar(senha);
              if (e.key === "Escape") fechar();
            }}
            placeholder="••••••"
          />
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={fechar}
            disabled={ocupado}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirmar(senha)}
            disabled={ocupado || senha.length === 0}
          >
            {ocupado ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
