"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Printer,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { nomesDoCard, urlDoQr, type VideoPais } from "@/lib/dia-dos-pais";
import {
  adicionarIrmao,
  confirmarUpload,
  criarUploadUrl,
  definirVideoConjunto,
  gerarCardsDosAlunos,
  procurarIrmaos,
  removerCard,
  removerIrmao,
} from "./actions";

const BUCKET = "dia-dos-pais";

/**
 * O bucket aceita até 300MB, então o limite aqui não é técnico: é a
 * paciência do pai. Um vídeo de 60MB no 4G leva quase um minuto pra
 * começar; o mesmo vídeo comprimido abre quase na hora. Avisamos em vez
 * de deixar passar calado, mas quem decide é a escola.
 */
const AVISO_TAMANHO_VIDEO_MB = 30;

export interface CardComFoto extends VideoPais {
  fotoUrl: string | null;
  /** Miniatura de cada irmão, na mesma ordem de irmaos_dados. */
  fotosIrmaos: (string | null)[];
}

interface Sugestao {
  alunoId: string;
  nome: string;
  serie: string | null;
  turma: string | null;
  cardProprio: string | null;
}

export interface Inscrito {
  alunoId: string;
  aluno_nome: string;
  serie: string | null;
  turma: string | null;
  responsavel: string;
  pago: boolean;
}

interface Props {
  cards: CardComFoto[];
  inscritos: Inscrito[];
  eventoId: string | null;
}

export function PainelDiaDosPais({ cards, inscritos, eventoId }: Props) {
  const [busca, setBusca] = useState("");
  const [serie, setSerie] = useState("");
  const [turma, setTurma] = useState("");

  // As opções saem dos cards existentes, na ordem em que já vieram
  // ordenados do servidor (série pedagógica, turma, nome).
  const series = useMemo(
    () => [...new Set(cards.map((c) => c.serie).filter(Boolean))] as string[],
    [cards],
  );
  // A lista de turmas acompanha a série escolhida: não adianta oferecer
  // "Turma C" se a série selecionada só tem A e B.
  const turmas = useMemo(() => {
    const base = serie ? cards.filter((c) => c.serie === serie) : cards;
    return [...new Set(base.map((c) => c.turma).filter(Boolean))].sort() as string[];
  }, [cards, serie]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return cards.filter((c) => {
      if (serie && c.serie !== serie) return false;
      if (turma && c.turma !== turma) return false;
      if (!termo) return true;
      return `${c.aluno_nome} ${c.irmaos_dados.map((i) => i.nome).join(" ")} ${c.serie ?? ""} ${c.turma ?? ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [cards, busca, serie, turma]);

  // Quem entra na folha de impressão. Começa vazio: imprimir papel é
  // irreversível, então a escolha é explícita.
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  function alternarCard(codigo: string) {
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(codigo)) n.delete(codigo);
      else n.add(codigo);
      return n;
    });
  }

  const visiveisMarcados = filtrados.filter((c) => marcados.has(c.codigo)).length;
  const todosVisiveisMarcados =
    filtrados.length > 0 && visiveisMarcados === filtrados.length;

  function alternarTodosVisiveis() {
    setMarcados((s) => {
      const n = new Set(s);
      for (const c of filtrados) {
        if (todosVisiveisMarcados) n.delete(c.codigo);
        else n.add(c.codigo);
      }
      return n;
    });
  }

  // Só os selecionados vão pra folha. Sem seleção, cai no filtro atual.
  const urlImpressao = useMemo(() => {
    const p = new URLSearchParams();
    if (marcados.size > 0) {
      p.set("codigos", [...marcados].join(","));
    } else {
      if (serie) p.set("serie", serie);
      if (turma) p.set("turma", turma);
    }
    const q = p.toString();
    return `/admin/dia-dos-pais/imprimir${q ? `?${q}` : ""}`;
  }, [marcados, serie, turma]);

  const filtroAtivo = !!(serie || turma || busca);

  return (
    <div className="space-y-6">
      {eventoId && inscritos.length > 0 && (
        <ListaDeInscritos inscritos={inscritos} eventoId={eventoId} />
      )}

      {cards.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-extrabold text-amadeus-blue">
              Cards gerados ({filtrados.length}
              {filtrados.length !== cards.length && ` de ${cards.length}`})
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={serie}
                onChange={(e) => {
                  setSerie(e.target.value);
                  setTurma(""); // a turma antiga pode não existir na nova série
                }}
                className="h-9 w-44 text-sm"
                aria-label="Filtrar por série"
              >
                <option value="">Todas as séries</option>
                {series.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>

              <Select
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                className="h-9 w-36 text-sm"
                aria-label="Filtrar por turma"
              >
                <option value="">Todas as turmas</option>
                {turmas.map((t) => (
                  <option key={t} value={t}>
                    Turma {t}
                  </option>
                ))}
              </Select>

              <Input
                placeholder="Buscar aluno…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 w-52 text-sm"
              />

              {filtroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setSerie("");
                    setTurma("");
                    setBusca("");
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:text-amadeus-blue hover:underline"
                >
                  limpar
                </button>
              )}

              <Button
                asChild
                size="sm"
                variant={marcados.size > 0 ? "default" : "outline"}
              >
                <Link href={urlImpressao} target="_blank">
                  <Printer className="size-3.5" />
                  {marcados.size > 0
                    ? `Imprimir ${marcados.size} selecionado${marcados.size === 1 ? "" : "s"}`
                    : serie || turma
                      ? "Imprimir esta seleção"
                      : "Imprimir todos"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Barra de seleção da folha de impressão */}
          <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-amadeus-blue-50/60 px-4 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-amadeus-blue">
              <input
                type="checkbox"
                checked={todosVisiveisMarcados}
                onChange={alternarTodosVisiveis}
                className="size-4 accent-[#1b3b7c]"
              />
              Selecionar {filtroAtivo ? "os filtrados" : "todos"} ({filtrados.length})
            </label>
            {marcados.size > 0 && (
              <>
                <span className="text-muted-foreground">
                  {marcados.size} marcado{marcados.size === 1 ? "" : "s"} para
                  impressão
                </span>
                <button
                  type="button"
                  onClick={() => setMarcados(new Set())}
                  className="text-xs font-semibold text-muted-foreground hover:text-amadeus-blue hover:underline"
                >
                  limpar seleção
                </button>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
            {filtrados.map((card) => (
              <LinhaAluno
                key={card.id}
                card={card}
                marcado={marcados.has(card.codigo)}
                onAlternar={() => alternarCard(card.codigo)}
              />
            ))}
            {filtrados.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum card com esse filtro.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Passo 1: escolher, entre os inscritos, quem vai ter card. */
function ListaDeInscritos({
  inscritos,
  eventoId,
}: {
  inscritos: Inscrito[];
  eventoId: string;
}) {
  const router = useRouter();
  const pagos = useMemo(() => inscritos.filter((i) => i.pago), [inscritos]);
  const pendentes = useMemo(() => inscritos.filter((i) => !i.pago), [inscritos]);

  // Começa com todos os pagos marcados: é o caso comum, e desmarcar um ou
  // outro é bem mais rápido do que marcar sessenta.
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(pagos.map((i) => i.alunoId)),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function alternar(id: string) {
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function todos(lista: Inscrito[], marcar: boolean) {
    setMarcados((s) => {
      const n = new Set(s);
      for (const i of lista) {
        if (marcar) n.add(i.alunoId);
        else n.delete(i.alunoId);
      }
      return n;
    });
  }

  function gerar() {
    setMsg(null);
    iniciar(async () => {
      const r = await gerarCardsDosAlunos(eventoId, [...marcados]);
      if (r.error) return setMsg(r.error);
      setMsg(
        r.criados === 0
          ? (r.mensagem ?? "Nenhum card novo.")
          : `${r.criados} card${r.criados === 1 ? "" : "s"} gerado${r.criados === 1 ? "" : "s"}.`,
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-amadeus-blue">
            Inscritos sem card ({inscritos.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Marque quem vai receber e clique em gerar.
          </p>
        </div>
        <Button onClick={gerar} disabled={pendente || marcados.size === 0}>
          {pendente && <Loader2 className="size-4 animate-spin" />}
          Gerar {marcados.size} card{marcados.size === 1 ? "" : "s"}
        </Button>
      </div>

      {msg && (
        <p className="mt-3 rounded-lg bg-amadeus-blue-50 px-3 py-2 text-sm text-amadeus-blue">
          {msg}
        </p>
      )}

      <GrupoInscritos
        titulo="Pagos"
        lista={pagos}
        marcados={marcados}
        onAlternar={alternar}
        onTodos={(m) => todos(pagos, m)}
      />

      {pendentes.length > 0 && (
        <GrupoInscritos
          titulo="Pagamento pendente"
          aviso="Ficam de fora por padrão. Marque se alguém acertou o pagamento."
          lista={pendentes}
          marcados={marcados}
          onAlternar={alternar}
          onTodos={(m) => todos(pendentes, m)}
        />
      )}
    </section>
  );
}

function GrupoInscritos({
  titulo,
  aviso,
  lista,
  marcados,
  onAlternar,
  onTodos,
}: {
  titulo: string;
  aviso?: string;
  lista: Inscrito[];
  marcados: Set<string>;
  onAlternar: (id: string) => void;
  onTodos: (marcar: boolean) => void;
}) {
  if (lista.length === 0) return null;
  const todosMarcados = lista.every((i) => marcados.has(i.alunoId));

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-amadeus-yellow-dark">
          {titulo} ({lista.length})
        </h3>
        <button
          type="button"
          onClick={() => onTodos(!todosMarcados)}
          className="text-xs font-semibold text-amadeus-blue hover:underline"
        >
          {todosMarcados ? "desmarcar todos" : "marcar todos"}
        </button>
      </div>
      {aviso && (
        <p className="mb-2 text-xs text-muted-foreground">{aviso}</p>
      )}

      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((i) => {
          const marcado = marcados.has(i.alunoId);
          return (
            <label
              key={i.alunoId}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                marcado
                  ? "border-amadeus-blue bg-amadeus-blue-50/60"
                  : "border-border/70 bg-white hover:border-amadeus-blue/40"
              }`}
            >
              <input
                type="checkbox"
                checked={marcado}
                onChange={() => onAlternar(i.alunoId)}
                className="mt-0.5 size-4 shrink-0 accent-[#1b3b7c]"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {i.aluno_nome}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[i.serie, i.turma && `Turma ${i.turma}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function LinhaAluno({
  card,
  marcado,
  onAlternar,
}: {
  card: CardComFoto;
  marcado: boolean;
  onAlternar: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [editandoIrmao, setEditandoIrmao] = useState(false);
  const [novoIrmao, setNovoIrmao] = useState("");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);

  /** indiceIrmao null = aluno principal; 0,1,2 = irmão daquela posição. */
  async function enviar(
    tipo: "video" | "foto",
    arquivo: File,
    indiceIrmao: number | null = null,
  ) {
    setErro(null);
    setSubindo(`${tipo}:${indiceIrmao ?? "p"}`);
    setProgresso(0);

    try {
      let corpo: Blob = arquivo;
      let ext = arquivo.name.split(".").pop() ?? (tipo === "video" ? "mp4" : "jpg");

      if (tipo === "foto") {
        // Reduz no navegador: 70 fotos de celular cruas encheriam o
        // bucket à toa, e o card imprime a 30mm — 900px é de sobra.
        corpo = await comprimirImagem(arquivo, 900, 0.85);
        ext = "jpg";
      } else if (arquivo.size > AVISO_TAMANHO_VIDEO_MB * 1024 * 1024) {
        const mb = (arquivo.size / 1024 / 1024).toFixed(0);
        if (
          !confirm(
            `Esse vídeo tem ${mb}MB.\n\nEle vai subir sem problema, mas no celular ` +
              `do pai, no 4G, vai demorar bastante pra começar a tocar.\n\n` +
              `Passando pelo script de compressão ele fica em torno de 10MB e abre ` +
              `quase na hora.\n\nSubir assim mesmo?`,
          )
        ) {
          setSubindo(null);
          return;
        }
      }

      const preparo = await criarUploadUrl(card.id, tipo, ext, indiceIrmao);
      if (preparo.error || !preparo.token || !preparo.path) {
        throw new Error(preparo.error ?? "Falha ao preparar o upload.");
      }

      setProgresso(30);
      const supabase = createClient();
      const { error: erroUp } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(preparo.path, preparo.token, corpo, {
          contentType: tipo === "foto" ? "image/jpeg" : arquivo.type || "video/mp4",
        });
      if (erroUp) throw new Error(erroUp.message);

      setProgresso(80);
      const fim = await confirmarUpload(
        card.id,
        tipo,
        preparo.path,
        indiceIrmao,
      );
      if (fim.error) throw new Error(fim.error);

      setProgresso(100);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setSubindo(null);
    }
  }

  /** Busca na base enquanto digita, pra não cadastrar nome inventado. */
  async function buscar(termo: string) {
    setNovoIrmao(termo);
    if (termo.trim().length < 3) return setSugestoes([]);
    const r = await procurarIrmaos(termo);
    setSugestoes(r.alunos ?? []);
  }

  async function salvarIrmao(s?: Sugestao) {
    const nome = (s?.nome ?? novoIrmao).trim();
    if (!nome) return setEditandoIrmao(false);

    // Se o irmão já tem card próprio, a família receberia DOIS cards.
    // Este card absorve o dele — mas quem decide é a escola.
    if (s?.cardProprio) {
      const ok = confirm(
        `${s.nome} já tem card próprio (/p/${s.cardProprio}).\n\n` +
          `Se continuar, este card passa a valer pelos dois: a foto e o vídeo ` +
          `que já estavam no card dele vêm junto, e o card separado é removido.\n\n` +
          `Sem isso, essa família receberia dois cards.\n\nContinuar?`,
      );
      if (!ok) return;
    }

    const r = await adicionarIrmao(card.id, {
      nome,
      alunoId: s?.alunoId ?? null,
    });
    if (r.error) return setErro(r.error);

    setNovoIrmao("");
    setSugestoes([]);
    setEditandoIrmao(false);
    router.refresh();
  }

  async function trocarModoVideo(conjunto: boolean) {
    if (conjunto === card.video_conjunto) return;
    const r = await definirVideoConjunto(card.id, conjunto);
    if (r.error) setErro(r.error);
    else router.refresh();
  }

  async function tirarIrmao(indice: number) {
    const r = await removerIrmao(card.id, indice);
    if (r.error) setErro(r.error);
    else router.refresh();
  }

  async function excluir() {
    if (
      !confirm(
        `Remover o card de ${nomesDoCard(card)}?\n\n` +
          `Se esse card já foi impresso e entregue, o QR do papel para de funcionar.`,
      )
    ) {
      return;
    }
    const r = await removerCard(card.id);
    if (r.error) setErro(r.error);
    else router.refresh();
  }

  return (
    <div
      className={`border-b border-border/50 px-4 py-3 last:border-0 ${
        marcado ? "bg-amadeus-blue-50/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          checked={marcado}
          onChange={onAlternar}
          title="Incluir na folha de impressão"
          className="size-4 shrink-0 accent-[#1b3b7c]"
        />

        {card.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.fotoUrl}
            alt={card.aluno_nome}
            className="size-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amadeus-blue-50 text-amadeus-blue/40">
            <ImageIcon className="size-4" />
          </div>
        )}

        <div className="min-w-40 flex-1">
          <p className="text-sm font-bold text-amadeus-blue">
            {nomesDoCard(card)}
          </p>
          <p className="text-xs text-muted-foreground">
            {[card.serie, card.turma && `Turma ${card.turma}`]
              .filter(Boolean)
              .join(" · ")}
            {" · "}
            <span className="font-mono">/p/{card.codigo}</span>
          </p>
          {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        </div>

        <div className="flex items-center gap-2">
          <BotaoUpload
            rotulo="Foto"
            icone={<ImageIcon className="size-3.5" />}
            aceita="image/*"
            pronto={!!card.foto_path}
            ocupado={subindo === "foto:p"}
            progresso={progresso}
            onArquivo={(f) => enviar("foto", f)}
          />
          <BotaoUpload
            rotulo="Vídeo"
            icone={<Video className="size-3.5" />}
            aceita="video/*"
            pronto={!!card.video_path}
            ocupado={subindo === "video:p"}
            progresso={progresso}
            onArquivo={(f) => enviar("video", f)}
          />

          <button
            type="button"
            onClick={() => setEditandoIrmao((v) => !v)}
            title="Adicionar irmão a este card"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
          >
            <UserPlus className="size-4" />
          </button>
          <a
            // URL absoluta, a mesma que vai dentro do QR. Um link
            // relativo aqui apontaria para admin.escolaamadeus.com/p/...,
            // e o proxy reescreve tudo desse subdomínio para /admin/*,
            // caindo em 404. De quebra, isso testa o link real do card.
            href={urlDoQr(card.codigo)}
            target="_blank"
            rel="noreferrer"
            title="Ver a página do pai (mesmo link do QR)"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
          >
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={excluir}
            title="Remover card"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Como o vídeo foi gravado nesta família */}
      {card.irmaos_dados.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-14 text-xs">
          <span className="font-semibold text-muted-foreground">Vídeo:</span>
          <div className="flex overflow-hidden rounded-lg border border-border/70">
            <button
              type="button"
              onClick={() => trocarModoVideo(false)}
              className={`px-2.5 py-1 font-semibold transition-colors ${
                !card.video_conjunto
                  ? "bg-amadeus-blue text-white"
                  : "bg-white text-muted-foreground hover:bg-amadeus-blue-50"
              }`}
            >
              Um por criança
            </button>
            <button
              type="button"
              onClick={() => trocarModoVideo(true)}
              className={`px-2.5 py-1 font-semibold transition-colors ${
                card.video_conjunto
                  ? "bg-amadeus-blue text-white"
                  : "bg-white text-muted-foreground hover:bg-amadeus-blue-50"
              }`}
            >
              Um vídeo só (gravaram juntos)
            </button>
          </div>
          {card.video_conjunto && (
            <span className="text-muted-foreground">
              a página mostra só o vídeo de {card.aluno_nome.split(" ")[0]}
            </span>
          )}
        </div>
      )}

      {/* Irmãos: cada um com foto e vídeo próprios */}
      {(card.irmaos_dados.length > 0 || editandoIrmao) && (
        <div className="mt-3 space-y-2 pl-14">
          {card.irmaos_dados.map((irmao, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-amadeus-yellow-50/60 px-3 py-2"
            >
              {card.fotosIrmaos[idx] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.fotosIrmaos[idx]!}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-amadeus-blue/30">
                  <ImageIcon className="size-3.5" />
                </div>
              )}

              <span className="min-w-32 flex-1 text-sm font-bold text-amadeus-yellow-dark">
                {irmao.nome}
                <span className="ml-2 font-normal text-muted-foreground">
                  irmão
                </span>
              </span>

              <BotaoUpload
                rotulo="Foto"
                icone={<ImageIcon className="size-3.5" />}
                aceita="image/*"
                pronto={!!irmao.foto_path}
                ocupado={subindo === `foto:${idx}`}
                progresso={progresso}
                onArquivo={(f) => enviar("foto", f, idx)}
              />
              {/* Com vídeo conjunto não há o que subir aqui: a página
                  mostra só o vídeo do aluno principal. */}
              {card.video_conjunto ? (
                <span className="px-2 text-xs italic text-muted-foreground">
                  no vídeo do irmão
                </span>
              ) : (
                <BotaoUpload
                  rotulo="Vídeo"
                  icone={<Video className="size-3.5" />}
                  aceita="video/*"
                  pronto={!!irmao.video_path}
                  ocupado={subindo === `video:${idx}`}
                  progresso={progresso}
                  onArquivo={(f) => enviar("video", f, idx)}
                />
              )}
              <button
                type="button"
                onClick={() => tirarIrmao(idx)}
                title="Tirar do card"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          {editandoIrmao && (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={novoIrmao}
                  onChange={(e) => buscar(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter salva o que está digitado. A busca é um
                    // atalho, não uma exigência: irmão de outra escola
                    // nunca vai aparecer na lista.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      salvarIrmao();
                    }
                    if (e.key === "Escape") {
                      setEditandoIrmao(false);
                      setSugestoes([]);
                    }
                  }}
                  placeholder="Nome do irmão…"
                  className="h-8 w-64 text-sm"
                />
                <Button size="sm" onClick={() => salvarIrmao()}>
                  Adicionar
                </Button>
              </div>

              {novoIrmao.trim().length >= 2 && (
                <ul className="absolute z-20 mt-1 w-80 overflow-hidden rounded-xl border border-border/60 bg-white shadow-lg">
                  {sugestoes.map((s) => (
                    <li key={s.alunoId}>
                      <button
                        type="button"
                        onClick={() => salvarIrmao(s)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-amadeus-blue-50"
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {s.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[s.serie, s.turma && `Turma ${s.turma}`]
                            .filter(Boolean)
                            .join(" · ")}
                          {s.cardProprio && (
                            <span className="ml-2 font-semibold text-amadeus-yellow-dark">
                              já tem card — será unido a este
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}

                  {/* Sempre disponível, mesmo com a busca vazia: o irmão
                      pode não estudar aqui, ou o nome pode estar grafado
                      diferente no cadastro. */}
                  <li className={sugestoes.length ? "border-t border-border/60" : ""}>
                    <button
                      type="button"
                      onClick={() => salvarIrmao()}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-amadeus-yellow-50"
                    >
                      <span className="text-sm font-semibold text-amadeus-yellow-dark">
                        Usar “{novoIrmao.trim()}”
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sugestoes.length
                          ? "escrever o nome exatamente assim"
                          : "não é aluno da escola — tudo bem, entra do mesmo jeito"}
                      </span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BotaoUpload({
  rotulo,
  icone,
  aceita,
  pronto,
  ocupado,
  progresso,
  onArquivo,
}: {
  rotulo: string;
  icone: React.ReactNode;
  aceita: string;
  pronto: boolean;
  ocupado: boolean;
  progresso: number;
  onArquivo: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={aceita}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArquivo(f);
          e.target.value = ""; // permite reenviar o mesmo arquivo
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={ocupado}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
          pronto
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-amadeus-yellow-50 text-amadeus-yellow-dark hover:bg-amadeus-yellow-100"
        } disabled:opacity-60`}
        title={pronto ? `Trocar ${rotulo.toLowerCase()}` : `Enviar ${rotulo.toLowerCase()}`}
      >
        {ocupado ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {progresso}%
          </>
        ) : (
          <>
            {pronto ? <Check className="size-3.5" /> : icone}
            {rotulo}
          </>
        )}
      </button>
    </>
  );
}

/**
 * Redimensiona e recomprime a foto no navegador antes de subir.
 * Mesma ideia já usada na capa do evento: o arquivo que sai do celular
 * tem 4–8MB e a gente só precisa de uns 100KB.
 */
async function comprimirImagem(
  arquivo: File,
  ladoMaximo: number,
  qualidade: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? arquivo), "image/jpeg", qualidade),
  );
}
