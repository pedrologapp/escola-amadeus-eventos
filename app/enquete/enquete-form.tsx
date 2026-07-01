"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  ESCALA,
  itensDoProfessor,
  turmasDe,
  type EnqueteDef,
  type ValorEscala,
} from "@/lib/enquete-config";
import { enviarEnquete } from "./actions";

export function EnqueteForm({
  def,
  jaRespondeu,
}: {
  def: EnqueteDef;
  jaRespondeu: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [passo, setPasso] = useState(0);
  const inicioRef = useRef<number>(0);
  const resetRef = useRef<number>(0); // início do bloco atual (cronômetro por bloco)
  const temposRef = useRef<Record<string, number>>({}); // segundos por bloco

  const PASSOS = def.passos;
  const TOTAL = PASSOS.length;

  // Mapa pergunta de clima -> seção, e tamanho de cada seção (pra saber quando
  // um "bloco" foi concluído e resetar o cronômetro daquele bloco).
  const { SECAO_DE_Q, TAM_SECAO } = useMemo(() => {
    const secaoDeQ: Record<string, string> = {};
    const tamSecao: Record<string, number> = {};
    for (const s of def.secoes) {
      tamSecao[s.id] = s.perguntas.length;
      for (const p of s.perguntas) secaoDeQ[p.id] = s.id;
    }
    tamSecao["fechar"] = def.ancoras.length;
    for (const a of def.ancoras) secaoDeQ[a.id] = "fechar";
    return { SECAO_DE_Q: secaoDeQ, TAM_SECAO: tamSecao };
  }, [def]);

  const [serie, setSerie] = useState("");
  const [turma, setTurma] = useState("");
  // disc: { [professorId]: { [itemId]: ValorEscala } }
  const [disc, setDisc] = useState<Record<string, Record<string, ValorEscala>>>({});
  const [clima, setClima] = useState<Record<string, ValorEscala>>({});
  const [dificuldade, setDificuldade] = useState<string[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [abertas, setAbertas] = useState<Record<string, string>>({});
  const [ajudaQuer, setAjudaQuer] = useState<boolean | null>(null);
  const [ajudaContato, setAjudaContato] = useState("");

  const turmasDisponiveis = turmasDe(def, serie);

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
  function setDiscVal(prof: (typeof def.professores)[number], itemId: string, v: ValorEscala) {
    const bloco = { ...(disc[prof.id] ?? {}), [itemId]: v };
    setDisc((p) => ({ ...p, [prof.id]: { ...p[prof.id], [itemId]: v } }));
    if (itensDoProfessor(def, prof).every((it) => bloco[it.id]))
      fecharBloco(`prof:${prof.id}`);
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
  // (professores, quando opcionais, comentários, abertas e a "porta de ajuda"
  // não contam)
  function faltamNoPasso(): number {
    const id = PASSOS[passo].id;
    if (id === "voce") return (serie ? 0 : 1) + (turma ? 0 : 1);
    if (id === "professores") {
      if (!def.professoresObrigatorio) return 0;
      let f = 0;
      for (const d of def.professores) {
        for (const it of itensDoProfessor(def, d)) {
          if (!disc[d.id]?.[it.id]) f++;
        }
      }
      return f; // a pergunta de dificuldade não é obrigatória
    }
    if (id === "fechar") return def.ancoras.filter((a) => !clima[a.id]).length;
    if (id === "ajuda") return 0;
    const sec = def.secoes.find((s) => s.id === id);
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
      setErro("Faltou escolher o ano e a turma (no primeiro passo).");
      irPara(0);
      return;
    }
    if (ajudaQuer === true && ajudaContato.trim().length < 2) {
      setErro("Você marcou que quer contato — por favor, preencha o campo.");
      return;
    }
    const duracaoSeg = inicioRef.current
      ? Math.round((Date.now() - inicioRef.current) / 1000)
      : 0;
    startTransition(async () => {
      const r = await enviarEnquete({
        slug: def.slug,
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
          {def.obrigadoTitulo}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{def.obrigadoTexto}</p>
        <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm">
          {def.avisoApoio}
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
              <p className="text-sm text-muted-foreground">{def.introTexto}</p>
              <div className="space-y-1.5">
                <Label htmlFor="serie">{def.labelSerie} *</Label>
                <Select
                  id="serie"
                  value={serie}
                  onChange={(e) => {
                    const nova = e.target.value;
                    setSerie(nova);
                    // se a turma escolhida não existe no novo ano, limpa.
                    if (turma && !turmasDe(def, nova).includes(turma)) setTurma("");
                  }}
                >
                  <option value="">Selecione...</option>
                  {def.series.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="turma">{def.labelTurma} *</Label>
                <Select
                  id="turma"
                  value={turma}
                  onChange={(e) => setTurma(e.target.value)}
                  disabled={!serie}
                >
                  <option value="">
                    {serie ? "Selecione..." : "Escolha o ano primeiro"}
                  </option>
                  {turmasDisponiveis.map((t) => (
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
            {!def.professoresObrigatorio && (
              <div className="rounded-2xl border border-amadeus-blue/20 bg-amadeus-blue-50/60 px-4 py-3 text-sm text-amadeus-blue">
                Avalie <strong>apenas quem você conhece/acompanha</strong>. Pode
                pular quem não faz parte do dia a dia do seu filho(a). 🙂
              </div>
            )}
            {def.professores.map((d) => (
              <Card key={d.id}>
                <CardContent className="space-y-4 pt-5">
                  <div>
                    <h3 className="font-bold text-amadeus-blue">{d.nome}</h3>
                    <p className="text-xs text-muted-foreground">{d.subtitulo}</p>
                  </div>
                  {itensDoProfessor(def, d).map((it) => (
                    <Pergunta
                      key={it.id}
                      texto={it.texto}
                      value={disc[d.id]?.[it.id]}
                      onChange={(v) => setDiscVal(d, it.id, v)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}

            {def.perguntaDificuldade && (
              <Card>
                <CardContent className="pt-5">
                  <p className="mb-3 text-sm font-medium">
                    {def.perguntaDificuldade}{" "}
                    <span className="text-muted-foreground">
                      (marque quantas quiser)
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {def.professores.map((d) => {
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
            )}

            <Comentario
              titulo="Quer comentar algo sobre os professores ou a equipe?"
              value={comentarios["professores"] ?? ""}
              onChange={(v) => setComentario("professores", v)}
            />
          </div>
        )}

        {def.secoes
          .filter((s) => s.id === atual.id)
          .map((sec) => (
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
                {def.ancoras.map((p) => (
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
                {def.abertas.map((a) => (
                  <div key={a.id} className="space-y-1.5">
                    <Label className="text-sm">{a.texto}</Label>
                    <Textarea
                      rows={a.id === "aberto" ? 4 : 2}
                      value={abertas[a.id] ?? ""}
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
                {def.ajuda.titulo}
              </p>
              <p className="text-xs text-muted-foreground">
                {def.ajuda.subtitulo}
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
                  {def.ajuda.naoLabel}
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
                  {def.ajuda.simLabel}
                </button>
              </div>
              {ajudaQuer === true && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{def.ajuda.contatoLabel}</Label>
                  <Input
                    value={ajudaContato}
                    onChange={(e) => setAjudaContato(e.target.value)}
                    placeholder={def.ajuda.contatoPlaceholder}
                    maxLength={200}
                  />
                </div>
              )}
              <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {def.avisoApoio}
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
