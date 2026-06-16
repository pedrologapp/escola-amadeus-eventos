"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Heart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ABERTAS,
  ANCORAS,
  AVISO_APOIO,
  DISCIPLINAS,
  ESCALA,
  ITENS_DISCIPLINA,
  SECOES_CLIMA,
  type ValorEscala,
} from "@/lib/enquete-config";
import { enviarEnquete } from "./actions";

export function EnqueteForm({
  series,
  jaRespondeu,
}: {
  series: string[];
  jaRespondeu: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const inicioRef = useRef<number>(0);

  const [serie, setSerie] = useState("");
  const [turma, setTurma] = useState("");
  const [disc, setDisc] = useState<
    Record<string, { clareza?: ValorEscala; respeito?: ValorEscala; sugestao?: string }>
  >({});
  const [clima, setClima] = useState<Record<string, ValorEscala>>({});
  const [dificuldade, setDificuldade] = useState<string[]>([]);
  const [abertas, setAbertas] = useState({ mais_gosta: "", mudaria: "" });
  const [ajudaQuer, setAjudaQuer] = useState<boolean | null>(null);
  const [ajudaContato, setAjudaContato] = useState("");

  useEffect(() => {
    inicioRef.current = Date.now();
  }, []);

  function setClimaVal(id: string, v: ValorEscala) {
    setClima((p) => ({ ...p, [id]: v }));
  }
  function setDiscVal(
    id: string,
    campo: "clareza" | "respeito",
    v: ValorEscala,
  ) {
    setDisc((p) => ({ ...p, [id]: { ...p[id], [campo]: v } }));
  }
  function toggleDificuldade(id: string) {
    setDificuldade((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  function enviar() {
    setErro(null);
    if (!serie) {
      setErro("Por favor, selecione sua série/ano no começo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const duracaoSeg = inicioRef.current
      ? Math.round((Date.now() - inicioRef.current) / 1000)
      : 0;

    startTransition(async () => {
      const r = await enviarEnquete({
        serie,
        turma,
        disc,
        dificuldade,
        clima,
        abertas,
        ajuda: { quer: ajudaQuer === true, contato: ajudaContato },
        duracaoSeg,
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
        <div className="grid size-16 place-items-center rounded-3xl bg-amadeus-blue text-white shadow-float">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-amadeus-blue">
          Respostas enviadas!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Muito obrigado por compartilhar a sua opinião. Cada resposta ajuda a
          deixar o Centro Educacional Amadeus melhor pra você. 💙
        </p>
        <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm">
          {AVISO_APOIO}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-amadeus-blue">
          🏫 Sua voz faz a diferença!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta pesquisa é <strong>anônima</strong> — a gente não sabe quem
          respondeu. Responda com sinceridade: não tem resposta certa ou errada. 💙
        </p>
      </header>

      {jaRespondeu && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Parece que você já respondeu por este aparelho. Se não foi você, pode
          responder normalmente. 💙
        </div>
      )}

      {/* Identificação */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-amadeus-blue">Sobre você</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="serie">Sua série / ano *</Label>
            <Select
              id="serie"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
            >
              <option value="">Selecione...</option>
              {series.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turma">Turma (opcional)</Label>
            <Input
              id="turma"
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
              placeholder="Ex: A, B, Manhã..."
              maxLength={30}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parte 1 — Disciplinas */}
      <SectionTitle>📚 Minhas aulas</SectionTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Avalie a <strong>aula e a matéria</strong>, com respeito. Use sugestões,
        não ofensas.
      </p>
      {DISCIPLINAS.map((d) => (
        <Card key={d.id} className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amadeus-blue">
              {d.nome}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{d.professor}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ITENS_DISCIPLINA.map((it) => (
              <Pergunta
                key={it.id}
                texto={it.texto}
                value={disc[d.id]?.[it.id as "clareza" | "respeito"]}
                onChange={(v) =>
                  setDiscVal(d.id, it.id as "clareza" | "respeito", v)
                }
              />
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                O que deixaria essa aula ainda melhor? (opcional)
              </Label>
              <Textarea
                rows={2}
                value={disc[d.id]?.sugestao ?? ""}
                onChange={(e) =>
                  setDisc((p) => ({
                    ...p,
                    [d.id]: { ...p[d.id], sugestao: e.target.value },
                  }))
                }
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dificuldade (multi) */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          <p className="mb-3 text-sm font-medium">
            Em quais matérias você sente mais dificuldade?{" "}
            <span className="text-muted-foreground">(marque quantas quiser)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINAS.map((d) => {
              const on = dificuldade.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDificuldade(d.id)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
                    on
                      ? "border-amadeus-blue bg-amadeus-blue text-white"
                      : "border-border bg-white text-foreground hover:bg-muted/50"
                  }`}
                >
                  {d.nome}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Parte 2 — Clima */}
      {SECOES_CLIMA.map((sec) => (
        <Card key={sec.id} className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amadeus-blue">
              {sec.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sec.perguntas.map((p) => (
              <Pergunta
                key={p.id}
                texto={p.texto}
                value={clima[p.id]}
                onChange={(v) => setClimaVal(p.id, v)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Âncoras */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amadeus-blue">
            Pra fechar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ANCORAS.map((p) => (
            <Pergunta
              key={p.id}
              texto={p.texto}
              value={clima[p.id]}
              onChange={(v) => setClimaVal(p.id, v)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Abertas */}
      <Card className="mb-5">
        <CardContent className="space-y-4 pt-5">
          {ABERTAS.map((a) => (
            <div key={a.id} className="space-y-1.5">
              <Label className="text-sm">{a.texto}</Label>
              <Textarea
                rows={2}
                value={abertas[a.id as "mais_gosta" | "mudaria"]}
                onChange={(e) =>
                  setAbertas((p) => ({ ...p, [a.id]: e.target.value }))
                }
                maxLength={1000}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Porta de ajuda */}
      <Card className="mb-5 border-amadeus-blue/30">
        <CardContent className="space-y-3 pt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amadeus-blue">
            <Heart className="size-4" />
            Quer que alguém da escola converse com você sobre alguma coisa?
          </p>
          <p className="text-xs text-muted-foreground">
            Você não precisa responder isto. É só se você quiser.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAjudaQuer(false)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                ajudaQuer === false
                  ? "border-amadeus-blue bg-amadeus-blue-50"
                  : "border-border bg-white"
              }`}
            >
              Não, está tudo bem
            </button>
            <button
              type="button"
              onClick={() => setAjudaQuer(true)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                ajudaQuer === true
                  ? "border-amadeus-blue bg-amadeus-blue-50"
                  : "border-border bg-white"
              }`}
            >
              Sim, quero
            </button>
          </div>
          {ajudaQuer === true && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Se quiser, escreva seu nome e turma para a coordenação te
                procurar:
              </Label>
              <Input
                value={ajudaContato}
                onChange={(e) => setAjudaContato(e.target.value)}
                placeholder="Seu nome e turma"
                maxLength={200}
              />
            </div>
          )}
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {AVISO_APOIO}
          </p>
        </CardContent>
      </Card>

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
        disabled={isPending}
        className="w-full"
      >
        <Send className="size-4" />
        {isPending ? "Enviando..." : "Enviar minhas respostas"}
      </Button>
      <p className="mt-3 pb-8 text-center text-xs text-muted-foreground">
        Obrigado por ajudar a melhorar a nossa escola! 💙
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 mt-2 text-lg font-extrabold text-foreground">
      {children}
    </h2>
  );
}

function Pergunta({
  texto,
  value,
  onChange,
}: {
  texto: string;
  value: ValorEscala | undefined;
  onChange: (v: ValorEscala) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{texto}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {ESCALA.map((op) => {
          const ativo = value === op.valor;
          return (
            <button
              key={op.valor}
              type="button"
              onClick={() => onChange(op.valor)}
              aria-pressed={ativo}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-center transition-colors ${
                ativo
                  ? "border-amadeus-blue bg-amadeus-blue-50"
                  : "border-border bg-white hover:bg-muted/40"
              }`}
            >
              <span className="text-2xl">{op.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">
                {op.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
