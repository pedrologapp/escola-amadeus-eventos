"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { VideoPais } from "@/lib/dia-dos-pais";
import { confirmarUpload, criarUploadUrl, gerarCards, removerCard } from "./actions";

const BUCKET = "dia-dos-pais";

/** Acima disso o vídeo demora demais no 4G do pai. O script de lote
 *  entrega uns 8MB; se alguém subir o arquivo bruto do celular pela
 *  tela, avisamos em vez de deixar passar calado. */
const AVISO_TAMANHO_VIDEO_MB = 25;

export interface CardComFoto extends VideoPais {
  fotoUrl: string | null;
}

interface Props {
  cards: CardComFoto[];
  gruposDeSeries: { label: string; series: string[] }[];
}

export function PainelDiaDosPais({ cards, gruposDeSeries }: Props) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cards;
    return cards.filter((c) =>
      `${c.aluno_nome} ${c.serie ?? ""} ${c.turma ?? ""}`
        .toLowerCase()
        .includes(termo),
    );
  }, [cards, busca]);

  return (
    <div className="space-y-6">
      <GeradorDeCards grupos={gruposDeSeries} temCards={cards.length > 0} />

      {cards.length > 0 && (
        <>
          <Input
            placeholder="Buscar aluno, série ou turma…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-sm"
          />

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
        </>
      )}
    </div>
  );
}

/** Passo 1: criar as linhas a partir da tabela de alunos. */
function GeradorDeCards({
  grupos,
  temCards,
}: {
  grupos: { label: string; series: string[] }[];
  temCards: boolean;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function alternar(serie: string) {
    setSelecionadas((s) =>
      s.includes(serie) ? s.filter((x) => x !== serie) : [...s, serie],
    );
  }

  function alternarGrupo(series: string[]) {
    const todasMarcadas = series.every((s) => selecionadas.includes(s));
    setSelecionadas((atual) =>
      todasMarcadas
        ? atual.filter((s) => !series.includes(s))
        : [...new Set([...atual, ...series])],
    );
  }

  function submeter() {
    setMsg(null);
    iniciar(async () => {
      const r = await gerarCards(selecionadas);
      if (r.error) return setMsg(r.error);
      setMsg(
        r.criados === 0
          ? (r.mensagem ?? "Nenhum card novo.")
          : `${r.criados} card${r.criados === 1 ? "" : "s"} criado${r.criados === 1 ? "" : "s"}.`,
      );
      setSelecionadas([]);
      router.refresh();
    });
  }

  return (
    <details
      open={!temCards}
      className="rounded-2xl border border-border/60 bg-white px-4 py-3"
    >
      <summary className="cursor-pointer text-sm font-bold text-amadeus-blue">
        {temCards ? "Adicionar mais turmas" : "1. Escolha quem vai ter card"}
      </summary>

      <div className="mt-4 space-y-4">
        {grupos.map((g) => (
          <div key={g.label}>
            <button
              type="button"
              onClick={() => alternarGrupo(g.series)}
              className="mb-2 text-xs font-bold uppercase tracking-wide text-amadeus-yellow-dark hover:underline"
            >
              {g.label}
            </button>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {g.series.map((serie) => (
                <Checkbox
                  key={serie}
                  label={serie}
                  checked={selecionadas.includes(serie)}
                  onChange={() => alternar(serie)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button
            onClick={submeter}
            disabled={pendente || selecionadas.length === 0}
          >
            {pendente && <Loader2 className="size-4 animate-spin" />}
            Gerar cards
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </details>
  );
}

function LinhaAluno({ card }: { card: CardComFoto }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState<"video" | "foto" | null>(null);
  const [progresso, setProgresso] = useState(0);

  async function enviar(tipo: "video" | "foto", arquivo: File) {
    setErro(null);
    setSubindo(tipo);
    setProgresso(0);

    try {
      let corpo: Blob = arquivo;
      let ext = arquivo.name.split(".").pop() ?? (tipo === "video" ? "mp4" : "jpg");

      if (tipo === "foto") {
        // Reduz no navegador: 70 fotos de celular cruas encheriam o
        // bucket à toa, e o card imprime a 33mm — 900px já é de sobra.
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

  async function excluir() {
    if (
      !confirm(
        `Remover o card de ${card.aluno_nome}?\n\n` +
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
    <div className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0">
      {/* Miniatura */}
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

      {/* Nome */}
      <div className="min-w-40 flex-1">
        <p className="text-sm font-bold text-amadeus-blue">{card.aluno_nome}</p>
        <p className="text-xs text-muted-foreground">
          {[card.serie, card.turma && `Turma ${card.turma}`]
            .filter(Boolean)
            .join(" · ")}
          {" · "}
          <span className="font-mono">/p/{card.codigo}</span>
        </p>
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </div>

      {/* Status + upload */}
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
    canvas.toBlob(
      (blob) => resolve(blob ?? arquivo),
      "image/jpeg",
      qualidade,
    ),
  );
}
