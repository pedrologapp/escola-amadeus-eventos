"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Receipt,
  Search,
  Send,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { formatarCPF, formatarTelefone } from "@/lib/validators";
import { criarCobrancaAvulsa } from "../actions";

interface Aluno {
  id: string;
  nome_completo: string;
  serie: string;
  turma: string;
}

const COR = "#1B3B7C";

export function CobrancaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Aluno
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Aluno[]>([]);
  const [selecionado, setSelecionado] = useState<Aluno | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  // Cobrança
  const [descricao, setDescricao] = useState("");
  const [valorTexto, setValorTexto] = useState("");

  // Responsável
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");

  // Busca de alunos com debounce (sem filtro de série/turma)
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
        const { data } = await supabase
          .from("alunos")
          .select("id, nome_completo, serie, turma")
          .ilike("nome_completo", `%${busca}%`)
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
  }, [busca, selecionado]);

  const valor = useMemo(() => {
    const limpo = valorTexto.replace(/\./g, "").replace(",", ".");
    const n = Number(limpo);
    return Number.isFinite(n) ? n : 0;
  }, [valorTexto]);

  const valido =
    !!selecionado &&
    descricao.trim().length >= 3 &&
    valor >= 1 &&
    nome.trim().length >= 2 &&
    cpf.replace(/\D/g, "").length === 11 &&
    telefone.length >= 8;

  function submit() {
    if (!valido || !selecionado) return;
    setErro(null);
    startTransition(async () => {
      const result = await criarCobrancaAvulsa({
        aluno_id: selecionado.id,
        descricao: descricao.trim(),
        valor,
        responsavel_nome: nome.trim(),
        cpf,
        telefone,
      });
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      setPaymentUrl(result.paymentUrl);
    });
  }

  async function copiarLink() {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (paymentUrl) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center">
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl text-white shadow-float"
            style={{ background: COR }}
          >
            <CheckCircle className="size-7" />
          </div>
          <h3 className="mt-4 text-xl font-extrabold" style={{ color: COR }}>
            Cobrança criada!
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            O link de pagamento foi enviado no WhatsApp do responsável. Quando
            o pagamento cair, a confirmação chega automaticamente.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={copiarLink}>
              <Copy className="size-4" />
              {copiado ? "Copiado!" : "Copiar link de pagamento"}
            </Button>
            <Button asChild variant="outline">
              <a href={paymentUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Abrir link
              </a>
            </Button>
            <Button
              type="button"
              style={{ background: COR }}
              onClick={() => router.push("/admin/cobrancas")}
            >
              Ver todas as cobranças
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aluno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: COR }}>
            <Search className="size-5" />
            Buscar aluno
          </CardTitle>
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

      {/* O que está sendo cobrado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: COR }}>
            <Receipt className="size-5" />
            O que está sendo cobrado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Livro de matemática — 3º ano"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              value={valorTexto}
              onChange={(e) =>
                setValorTexto(e.target.value.replace(/[^\d.,]/g, ""))
              }
              placeholder="Ex.: 45,00"
              inputMode="decimal"
            />
            {valor >= 1 && (
              <p className="text-xs text-muted-foreground">
                Será cobrado {formatCurrency(valor)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Responsável */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: COR }}>
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
          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF * (exigido pelo Asaas)</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(formatarCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tel">WhatsApp * (recebe o link)</Label>
            <Input
              id="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(84) 99999-9999"
              inputMode="numeric"
            />
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
          <a href="/admin/cobrancas">Cancelar</a>
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={!valido || isPending}
          style={{ background: COR }}
        >
          <Send className="size-4" />
          {isPending
            ? "Gerando link..."
            : "Gerar cobrança e enviar no WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
