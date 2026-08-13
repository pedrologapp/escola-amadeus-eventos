"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nomesDoCard, type VideoPais } from "@/lib/dia-dos-pais";
import {
  confirmarUpload,
  criarUploadUrl,
  definirIrmaos,
  gerarCardsDosAlunos,
  removerCard,
} from "./actions";

const BUCKET = "dia-dos-pais";

/** Acima disso o vídeo demora demais no 4G do pai. O script de lote
 *  entrega uns 8MB; se alguém subir o arquivo bruto do celular pela
 *  tela, avisamos em vez de deixar passar calado. */
const AVISO_TAMANHO_VIDEO_MB = 25;

export interface CardComFoto extends VideoPais {
  fotoUrl: string | null;
}

export interface Inscrito {
  alunoId: string;
  nome: string;
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

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cards;
    return cards.filter((c) =>
      `${c.aluno_nome} ${c.irmaos.join(" ")} ${c.serie ?? ""} ${c.turma ?? ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [cards, busca]);

  return (
    <div className="space-y-6">
      {eventoId && inscritos.length > 0 && (
        <ListaDeInscritos inscritos={inscritos} eventoId={eventoId} />
      )}

      {cards.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-amadeus-blue">
              Cards gerados ({cards.length})
            </h2>
            <Input
              placeholder="Buscar aluno, série ou turma…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
            {filtrados.map((card) => (
              <LinhaAluno key={card.id} card={card} />
            ))}
            {filtrados.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ninguém encontrado com “{busca}”.
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
                  {i.nome}
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

function LinhaAluno({ card }: { card: CardComFoto }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState<"video" | "foto" | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [editandoIrmao, setEditandoIrmao] = useState(false);
  const [novoIrmao, setNovoIrmao] = useState("");

  async function enviar(tipo: "video" | "foto", arquivo: File) {
    setErro(null);
    setSubindo(tipo);
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
            `Esse vídeo tem ${mb}MB. Vai demorar pra carregar no celular do pai ` +
              `e consome muito espaço.\n\nO ideal é passar pelo script de compressão ` +
              `(fica em ~8MB).\n\nSubir assim mesmo?`,
          )
        ) {
          setSubindo(null);
          return;
        }
      }

      const preparo = await criarUploadUrl(card.id, tipo, ext);
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
      const fim = await confirmarUpload(card.id, tipo, preparo.path);
      if (fim.error) throw new Error(fim.error);

      setProgresso(100);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setSubindo(null);
    }
  }

  async function salvarIrmao() {
    const nome = novoIrmao.trim();
    if (!nome) return setEditandoIrmao(false);
    const r = await definirIrmaos(card.id, [...card.irmaos, nome]);
    if (r.error) setErro(r.error);
    else {
      setNovoIrmao("");
      setEditandoIrmao(false);
      router.refresh();
    }
  }

  async function tirarIrmao(nome: string) {
    const r = await definirIrmaos(
      card.id,
      card.irmaos.filter((n) => n !== nome),
    );
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
    <div className="border-b border-border/50 px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
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
            ocupado={subindo === "foto"}
            progresso={progresso}
            onArquivo={(f) => enviar("foto", f)}
          />
          <BotaoUpload
            rotulo="Vídeo"
            icone={<Video className="size-3.5" />}
            aceita="video/*"
            pronto={!!card.video_path}
            ocupado={subindo === "video"}
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
            href={`/p/${card.codigo}`}
            target="_blank"
            rel="noreferrer"
            title="Ver a página do pai"
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

      {/* Irmãos que dividem este card */}
      {(card.irmaos.length > 0 || editandoIrmao) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-14">
          {card.irmaos.map((nome) => (
            <span
              key={nome}
              className="flex items-center gap-1.5 rounded-full bg-amadeus-yellow-50 px-3 py-1 text-xs font-semibold text-amadeus-yellow-dark"
            >
              {nome}
              <button
                type="button"
                onClick={() => tirarIrmao(nome)}
                title="Tirar do card"
                className="hover:text-red-600"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          {editandoIrmao && (
            <span className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={novoIrmao}
                onChange={(e) => setNovoIrmao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvarIrmao();
                  if (e.key === "Escape") setEditandoIrmao(false);
                }}
                placeholder="Nome do irmão"
                className="h-8 w-48 text-sm"
              />
              <Button size="sm" onClick={salvarIrmao}>
                Salvar
              </Button>
            </span>
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
