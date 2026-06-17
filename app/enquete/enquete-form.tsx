"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  SERIES,
  TURMAS,
  type ValorEscala,
} from "@/lib/enquete-config";
import { enviarEnquete } from "./actions";

const PASSOS = [
  { id: "voce", emoji: "👋", titulo: "Vamos começar!", frase: "Primeiro, conta pra gente sua turma." },
  { id: "professores", emoji: "📚", titulo: "Suas aulas e professores", frase: "Como estão sendo as aulas? Avalie com respeito. 💬" },
  { id: "sentir", emoji: "💙", titulo: "Como você se sente aqui", frase: "Agora é sobre você. Pode ser sincero(a)!" },
  { id: "convivencia", emoji: "🤝", titulo: "Convivência e respeito", frase: "Sobre o clima entre todo mundo." },
  { id: "regras", emoji: "📣", titulo: "Regras, voz e motivação", frase: "Sua opinião conta de verdade." },
  { id: "estrutura", emoji: "🏫", titulo: "A escola por dentro", frase: "Espaço, limpeza, cantina e por aí vai." },
  { id: "fechar", emoji: "⭐", titulo: "Quase lá!", frase: "Só mais um pouquinho." },
  { id: "ajuda", emoji: "🤗", titulo: "Pra terminar", frase: "Se quiser, a gente te escuta." },
];
const TOTAL = PASSOS.length;

// Mapa pergunta de clima -> seção, e tamanho de cada seção (pra saber quando
// um "bloco" foi concluído e resetar o cronômetro daquele bloco).
const SECAO_DE_Q: Record<string, string> = {};
const TAM_SECAO: Record<string, number> = {};
for (const s of SECOES_CLIMA) {
  TAM_SECAO[s.id] = s.perguntas.length;
  for (const p of s.perguntas) SECAO_DE_Q[p.id] = s.id;
}
TAM_SECAO["fechar"] = ANCORAS.length;
for (const a of ANCORAS) SECAO_DE_Q[a.id] = "fechar";

export function EnqueteForm({ jaRespondeu }: { jaRespondeu: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [passo, setPasso] = useState(0);
  const inicioRef = useRef<number>(0);
  const resetRef = useRef<number>(0); // início do bloco atual (cronômetro por bloco)
  const temposRef = useRef<Record<string, number>>({}); // segundos por bloco

  const [serie, setSerie] = useState("");
  const [turma, setTurma] = useState("");
  const [disc, setDisc] = useState<
    Record<string, { clareza?: ValorEscala; respeito?: ValorEscala; sugestao?: string }>
  >({});
  const [clima, setClima] = useState<Record<string, ValorEscala>>({});
  const [dificuldade, setDificuldade] = useState<string[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [abertas, setAbertas] = useState({ mais_gosta: "", mudaria: "" });
  const [ajudaQuer, setAjudaQuer] = useState<boolean | null>(null);
  const [ajudaContato, setAjudaContato] = useState("");

  useEffect(() => {
    const agora = Date.now();
    inicioRef.current = agora;
    resetRef.current = agora;
  }, []);

  // Fecha um bloco: grava o tempo gasto desde o último reset e reinicia o
  // cronômetro. Assim cada professor/seção tem seu próprio tempo.
  function fecharBloco(id: string) {
    if (temposRef.current[id] != null) return;
    // Chamado só em handlers de resposta (não no render). Date.now() é seguro aqui.
    // eslint-disable-next-line react-hooks/purity
    const agora = Date.now();
    temposRef.current[id] = Math.round((agora - resetRef.current) / 1000);
    resetRef.current = agora;
  }

  function setClimaVal(id: string, v: ValorEscala) {
    setClima((p) => ({ ...p, [id]: v }));
    const sec = SECAO_DE_Q[id];
    if (sec) {
      let cont = 0;
      for (const [qid, secId] of Object.entries(SECAO_DE_Q)) {
        if (secId !== sec) continue;
        const val = qid === id ? v : clima[qid];
        if (val) cont++;
      }
      if (cont === TAM_SECAO[sec]) fecharBloco(`sec:${sec}`);
    }
  }
  function setDiscVal(id: string, campo: "clareza" | "respeito", v: ValorEscala) {
    const bloco = { ...(disc[id] ?? {}), [campo]: v };
    setDisc((p) => ({ ...p, [id]: { ...p[id], [campo]: v } }));
    if (bloco.clareza && bloco.respeito) fecharBloco(`prof:${id}`);
  }
  function setComentario(id: string, v: string) {
    setComentarios((p) => ({ ...p, [id]: v }));
  }
  function toggleDificuldade(id: string) {
    setDificuldade((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  // Quantas perguntas obrigatórias faltam no passo atual.
  // (comentários, perguntas abertas e a "porta de ajuda" são opcionais)
  function faltamNoPasso(): number {
    const id = PASSOS[passo].id;
    if (id === "voce") return (serie ? 0 : 1) + (turma ? 0 : 1);
    if (id === "professores") {
      let f = 0;
      for (const d of DISCIPLINAS) {
        if (!disc[d.id]?.clareza) f++;
        if (!disc[d.id]?.respeito) f++;
      }
      return f; // a pergunta de dificuldade não é obrigatória
    }
    if (id === "fechar") return ANCORAS.filter((a) => !clima[a.id]).length;
    if (id === "ajuda") return 0;
    const sec = SECOES_CLIMA.find((s) => s.id === id);
    return sec ? sec.perguntas.filter((p) => !clima[p.id]).length : 0;
  }

  function irPara(novo: number) {
    setErro(null);
    setPasso(novo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function proximo() {
    const faltam = faltamNoPasso();
    if (faltam > 0) {
      setErro(
        `Responda todas as perguntas deste passo pra continuar. Faltam ${faltam}. 🙂`,
      );
      return;
    }
    irPara(Math.min(passo + 1, TOTAL - 1));
  }

  function enviar() {
    setErro(null);
    if (!serie || !turma) {
      setErro("Faltou escolher sua série/ano e turma (no primeiro passo).");
      irPara(0);
      return;
    }
    if (ajudaQuer === true && ajudaContato.trim().length < 2) {
      setErro("Você marcou que quer conversar — por favor, escreva seu nome.");
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
        comentarios,
        abertas,
        ajuda: { quer: ajudaQuer === true, contato: ajudaContato },
        duracaoSeg,
        tempos: temposRef.current,
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
          Prontinho! 🎉
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

  const atual = PASSOS[passo];
  const ehUltimo = passo === TOTAL - 1;
  const faltamAtual = faltamNoPasso();

  return (
    <div className="min-h-screen pb-28">
      {/* Barra de progresso */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-amadeus-blue-50/80 px-4 pb-2 pt-4 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-amadeus-blue">
            <span>
              Passo {passo + 1} de {TOTAL}
            </span>
            <span>{Math.round(((passo + 1) / TOTAL) * 100)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-amadeus-blue transition-all duration-500"
              style={{ width: `${((passo + 1) / TOTAL) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-6">
        {/* Cabeçalho do passo */}
        <header className="mb-5 text-center">
          <div className="text-5xl">{atual.emoji}</div>
          <h1 className="mt-2 text-xl font-extrabold text-amadeus-blue">
            {atual.titulo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{atual.frase}</p>
        </header>

        {jaRespondeu && passo === 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Parece que você já respondeu por este aparelho. Se não foi você, pode
            responder normalmente. 💙
          </div>
        )}

        {/* Conteúdo do passo */}
        {atual.id === "voce" && (
          <Card>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm text-muted-foreground">
                Esta pesquisa é <strong>anônima</strong> — a gente não sabe quem
                respondeu. Responda com sinceridade: não tem certo nem errado. 💙
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="serie">Sua série / ano *</Label>
                <Select
                  id="serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {SERIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="turma">Turma</Label>
                <Select
                  id="turma"
                  value={turma}
                  onChange={(e) => setTurma(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {TURMAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {atual.id === "professores" && (
          <div className="space-y-4">
            {DISCIPLINAS.map((d) => (
              <Card key={d.id}>
                <CardContent className="space-y-4 pt-5">
                  <div>
                    <h3 className="font-bold text-amadeus-blue">{d.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {d.professor}
                    </p>
                  </div>
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
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="pt-5">
                <p className="mb-3 text-sm font-medium">
                  Em quais matérias você sente mais dificuldade?{" "}
                  <span className="text-muted-foreground">
                    (marque quantas quiser)
                  </span>
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
                            : "border-border bg-white hover:bg-muted/50"
                        }`}
                      >
                        {d.nome}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Comentario
              titulo="Quer comentar algo sobre as aulas ou os professores?"
              value={comentarios["professores"] ?? ""}
              onChange={(v) => setComentario("professores", v)}
            />
          </div>
        )}

        {SECOES_CLIMA.filter((s) => s.id === atual.id).map((sec) => (
          <div key={sec.id} className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-5">
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
            <Comentario
              titulo="Quer comentar algo sobre isso?"
              value={comentarios[sec.id] ?? ""}
              onChange={(v) => setComentario(sec.id, v)}
            />
          </div>
        ))}

        {atual.id === "fechar" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-5">
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
            <Card>
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
          </div>
        )}

        {atual.id === "ajuda" && (
          <Card className="border-amadeus-blue/30">
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
                    Escreva seu nome e turma * (pra coordenação te procurar)
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
        )}

        {erro && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="size-5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </div>

      {/* Navegação fixa */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/50 bg-white/90 px-4 py-3 backdrop-blur">
        {faltamAtual > 0 && atual.id !== "ajuda" && (
          <p className="mx-auto mb-2 max-w-xl text-center text-xs font-semibold text-amber-600">
            Faltam {faltamAtual} resposta{faltamAtual === 1 ? "" : "s"} neste
            passo.
          </p>
        )}
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {passo > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => irPara(passo - 1)}
              disabled={isPending}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
          )}
          {ehUltimo ? (
            <Button
              type="button"
              onClick={enviar}
              disabled={isPending}
              className="flex-1"
            >
              <Send className="size-4" />
              {isPending ? "Enviando..." : "Enviar respostas"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={proximo}
              disabled={faltamAtual > 0}
              className="flex-1"
            >
              Próximo
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Comentario({
  titulo,
  value,
  onChange,
}: {
  titulo: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5 pt-5">
        <Label className="text-sm">
          💬 {titulo}{" "}
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={1000}
          placeholder="Escreva aqui o que quiser..."
        />
      </CardContent>
    </Card>
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
