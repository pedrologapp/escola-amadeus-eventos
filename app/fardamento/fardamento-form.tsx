"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Minus, Plus, Send, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODELOS, TAMANHOS, TIPOS } from "@/lib/fardamento-config";
import { registrarFardamento } from "./actions";

export function FardamentoForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const [nome, setNome] = useState("");
  const [quer, setQuer] = useState<boolean | null>(null);
  const [modelo, setModelo] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const precisaDetalhes = quer === true;
  const valido =
    nome.trim().length >= 2 &&
    quer !== null &&
    (!precisaDetalhes || (!!modelo && !!tamanho && !!tipo));

  function enviar() {
    setErro(null);
    if (!valido) {
      setErro("Preencha seu nome e as opções do fardamento.");
      return;
    }
    startTransition(async () => {
      const r = await registrarFardamento({
        nome,
        quer: quer === true,
        modelo,
        tamanho,
        tipo,
        quantidade,
      });
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (enviado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <div className="grid size-20 place-items-center rounded-3xl bg-amadeus-blue text-white shadow-float">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-amadeus-blue">
          Registrado! 🎉
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Obrigado! Sua resposta sobre o fardamento foi registrada. 💙
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 text-center">
        <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-amadeus-blue-50 text-amadeus-blue">
          <Shirt className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-amadeus-blue">
          Fardamento dos Colaboradores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre se você quer o fardamento e, se sim, o seu tamanho.
        </p>
      </header>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-amadeus-blue">Seus dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Você quer o fardamento? *</Label>
            <div className="flex gap-2">
              <Opcao ativo={quer === true} onClick={() => setQuer(true)}>
                Sim, quero
              </Opcao>
              <Opcao ativo={quer === false} onClick={() => setQuer(false)}>
                Não quero
              </Opcao>
            </div>
          </div>
        </CardContent>
      </Card>

      {precisaDetalhes && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-amadeus-blue">Seu fardamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <div className="flex flex-wrap gap-2">
                {MODELOS.map((m) => (
                  <Opcao
                    key={m.valor}
                    ativo={modelo === m.valor}
                    onClick={() => setModelo(m.valor)}
                  >
                    {m.label}
                  </Opcao>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tamanho *</Label>
              <div className="flex flex-wrap gap-2">
                {TAMANHOS.map((t) => (
                  <Opcao
                    key={t}
                    ativo={tamanho === t}
                    onClick={() => setTamanho(t)}
                  >
                    {t}
                  </Opcao>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => (
                  <Opcao
                    key={t.valor}
                    ativo={tipo === t.valor}
                    onClick={() => setTipo(t.valor)}
                  >
                    {t.label}
                  </Opcao>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-xl font-extrabold tabular-nums text-amadeus-blue">
                  {quantidade}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  onClick={() => setQuantidade((q) => Math.min(50, q + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="size-5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        onClick={enviar}
        disabled={isPending || !valido}
        className="w-full"
      >
        <Send className="size-4" />
        {isPending ? "Enviando..." : "Enviar"}
      </Button>
    </div>
  );
}

function Opcao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
        ativo
          ? "border-amadeus-blue bg-amadeus-blue text-white"
          : "border-border bg-white text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}
