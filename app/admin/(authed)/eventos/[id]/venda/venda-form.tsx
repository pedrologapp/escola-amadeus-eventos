"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Minus,
  Plus,
  Search,
  Ticket,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getLoteAtivo, getPrecoAtual, type Lote } from "@/lib/lotes";
import { formatCurrency } from "@/lib/utils";
import { formatarTelefone } from "@/lib/validators";
import { registrarVendaDinheiro } from "../../actions";

interface Tipo {
  id: string;
  nome: string;
  preco: number;
  descricao: string | null;
  lotes: Lote[];
  restantes?: number | null;
  esgotado?: boolean;
}

interface Aluno {
  id: string;
  nome_completo: string;
  serie: string;
  turma: string;
}

interface Props {
  eventoId: string;
  eventoNome: string;
  cor: string;
  seriesPermitidas: string[] | null;
  turmasPermitidas: string[] | null;
  tipos: Tipo[];
}

export function VendaForm({
  eventoId,
  eventoNome,
  cor,
  seriesPermitidas,
  turmasPermitidas,
  tipos,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Aluno
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Aluno[]>([]);
  const [selecionado, setSelecionado] = useState<Aluno | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  // Responsável
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // Quantidades
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    Object.fromEntries(tipos.map((t) => [t.id, 0])),
  );

  // Busca de alunos com debounce
  useEffect(() => {
    if (busca.length < 2 || selecionado) {
      setLista([]);
      setShowDrop(false);
      return;
    }
    const ctrl = new AbortController();
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        let q = supabase
          .from("alunos")
          .select("id, nome_completo, serie, turma")
          .ilike("nome_completo", `%${busca}%`);
        if (seriesPermitidas?.length) q = q.in("serie", seriesPermitidas);
        if (turmasPermitidas?.length) q = q.in("turma", turmasPermitidas);
        const { data } = await q
          .order("nome_completo")
          .limit(10)
          .abortSignal(ctrl.signal);
        setLista(data ?? []);
        setShowDrop((data ?? []).length > 0);
      } catch {
        /* abort */
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [busca, selecionado, seriesPermitidas, turmasPermitidas]);

  const totalSenhas = useMemo(
    () => Object.values(qtds).reduce((a, b) => a + b, 0),
    [qtds],
  );
  const valorTotal = useMemo(
    () => tipos.reduce((sum, t) => sum + (qtds[t.id] ?? 0) * getPrecoAtual(t), 0),
    [tipos, qtds],
  );

  const valido =
    !!selecionado && nome.trim().length >= 2 && telefone.length >= 8 && totalSenhas > 0;

  function inc(id: string) {
    setQtds((p) => {
      const tipo = tipos.find((t) => t.id === id);
      const atual = p[id] ?? 0;
      const limite =
        typeof tipo?.restantes === "number" ? tipo.restantes : Infinity;
      if (atual >= limite) return p;
      return { ...p, [id]: atual + 1 };
    });
  }
  function dec(id: string) {
    setQtds((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) }));
  }

  function submit() {
    if (!valido || !selecionado) return;
    setErro(null);
    startTransition(async () => {
      const result = await registrarVendaDinheiro({
        evento_id: eventoId,
        aluno_id: selecionado.id,
        responsavel_nome: nome.trim(),
        telefone,
        email: email.trim(),
        quantidades: qtds,
      });
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      setSucesso(true);
      setTimeout(() => router.push(`/admin/eventos/${eventoId}`), 1500);
    });
  }

  if (sucesso) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center">
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl text-white shadow-float"
            style={{ background: cor }}
          >
            <CheckCircle className="size-7" />
          </div>
          <h3 className="mt-4 text-xl font-extrabold" style={{ color: cor }}>
            Venda registrada!
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Pagamento em dinheiro confirmado. Os QR Codes estão sendo enviados
            no WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aluno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: cor }}>
            <Search className="size-5" />
            Buscar aluno
          </CardTitle>
          <CardDescription>{eventoNome}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Label htmlFor="busca">Nome do aluno *</Label>
            <Input
              id="busca"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (selecionado) setSelecionado(null);
              }}
              placeholder="Digite ao menos 2 letras..."
              autoComplete="off"
              disabled={!!selecionado}
              className={selecionado ? "border-green-500 bg-green-50" : ""}
            />
            {buscando && (
              <span className="absolute right-3 top-9 size-5 animate-spin rounded-full border-b-2 border-amadeus-blue" />
            )}
            {showDrop && !selecionado && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-float">
                {lista.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setSelecionado(s);
                      setBusca(s.nome_completo);
                      setShowDrop(false);
                    }}
                    className="flex w-full flex-col items-start border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-amadeus-blue-50/60"
                  >
                    <span className="font-semibold">{s.nome_completo}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.serie} · Turma {s.turma}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selecionado && (
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-green-300 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="size-5 text-green-700" />
                <div>
                  <div className="text-sm font-semibold text-green-900">
                    {selecionado.nome_completo}
                  </div>
                  <div className="text-xs text-green-700">
                    {selecionado.serie} · Turma {selecionado.turma}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelecionado(null);
                  setBusca("");
                }}
              >
                <X />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsável */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: cor }}>
            <User className="size-5" />
            Dados do responsável
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do responsável *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tel">WhatsApp * (recebe o QR)</Label>
              <Input
                id="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(84) 99999-9999"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingressos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: cor }}>
            <Ticket className="size-5" />
            Senhas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tipos.map((tipo) => {
            const q = qtds[tipo.id] ?? 0;
            const preco = getPrecoAtual(tipo);
            const lote = getLoteAtivo(tipo.lotes);
            const esgotado = tipo.esgotado ?? false;
            const limite =
              typeof tipo.restantes === "number" ? tipo.restantes : Infinity;
            const noLimite = q >= limite;
            return (
              <div
                key={tipo.id}
                className="flex items-center justify-between rounded-2xl border-2 p-4"
                style={{
                  borderColor: esgotado
                    ? "#9ca3af33"
                    : q > 0
                      ? cor
                      : "transparent",
                  background: esgotado
                    ? "#9ca3af14"
                    : q > 0
                      ? `${cor}10`
                      : "var(--muted)",
                  opacity: esgotado ? 0.7 : 1,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold"
                      style={{ color: esgotado ? "#6b7280" : cor }}
                    >
                      {tipo.nome}
                    </span>
                    {esgotado && (
                      <span className="rounded-full bg-gray-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Esgotado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(preco)}
                    {lote ? ` · ${lote.nome}` : ""}
                    {typeof tipo.restantes === "number" && !esgotado &&
                      ` · restam ${tipo.restantes}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => dec(tipo.id)}
                    disabled={q === 0 || esgotado}
                    className="size-9"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span
                    className="w-8 text-center text-xl font-extrabold tabular-nums"
                    style={{ color: esgotado ? "#6b7280" : cor }}
                  >
                    {q}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => inc(tipo.id)}
                    disabled={esgotado || noLimite}
                    className="size-9"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div
            className="mt-2 flex items-center justify-between rounded-2xl p-4"
            style={{ background: `${cor}1A` }}
          >
            <span className="flex items-center gap-2 font-semibold" style={{ color: cor }}>
              <Wallet className="size-5" />
              Total em dinheiro
            </span>
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: cor }}>
              {formatCurrency(valorTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="size-5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" type="button">
          <a href={`/admin/eventos/${eventoId}`}>Cancelar</a>
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={!valido || isPending}
          style={{ background: cor }}
        >
          {isPending ? "Registrando..." : "Registrar venda em dinheiro"}
        </Button>
      </div>
    </div>
  );
}
