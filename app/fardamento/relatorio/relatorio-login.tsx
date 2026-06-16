"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { entrarRelatorio } from "./actions";

export function RelatorioLogin() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await entrarRelatorio(formData);
      if (!r.ok) {
        setErro(r.error ?? "Não foi possível entrar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-2">
        <CardHeader className="items-center pb-2 text-center">
          <Logo variant="stacked" className="mb-6" />
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amadeus-blue-50 px-3 py-1 text-sm font-semibold text-amadeus-blue">
            <Shirt className="size-4" />
            Relatório de Fardamento
          </div>
          <CardTitle className="text-2xl">Acesso da coordenação</CardTitle>
          <CardDescription>
            Entre com seu usuário e senha para ver os pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user">Usuário</Label>
              <Input
                id="user"
                name="user"
                autoComplete="username"
                autoFocus
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
              />
            </div>
            {erro && (
              <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {erro}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
