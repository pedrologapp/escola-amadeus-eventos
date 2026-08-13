import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assinarArquivo,
  codigoValido,
  type VideoPais,
} from "@/lib/dia-dos-pais";

/**
 * Página do vídeo do Dia dos Pais — o destino do QR impresso no card.
 *
 * É pública (sem login): quem tem o código vê o vídeo. O código é
 * aleatório e não sequencial, então não dá pra "passear" pelos vídeos
 * dos outros alunos chutando URLs.
 *
 * `force-dynamic` porque a signed URL do vídeo expira — não pode ficar
 * cacheada numa página estática, senão o pai abre daqui a um mês e o
 * vídeo não carrega.
 */
export const dynamic = "force-dynamic";

/** A signed URL precisa durar mais que o vídeo mais longo + tempo de pausa. */
const VALIDADE_SEGUNDOS = 60 * 60 * 6; // 6 horas

/**
 * Palatino Linotype, com os equivalentes de cada plataforma na sequência:
 * Book Antiqua (Windows antigo), Palatino (macOS/iOS), Palladio (Linux).
 * No Android nenhuma existe e cai numa serifada do sistema — que ainda
 * mantém o ar clássico que a peça pede.
 */
const SERIF = `"Palatino Linotype", "Book Antiqua", Palatino, "URW Palladio L", Georgia, serif`;

async function buscarVideo(codigo: string): Promise<VideoPais | null> {
  if (!codigoValido(codigo)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("videos_pais")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  return (data as VideoPais | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const video = await buscarVideo(codigo);
  if (!video) return { title: "Vídeo não encontrado · Escola Amadeus" };

  return {
    title: `Feliz Dia dos Pais! · ${video.aluno_nome}`,
    description: `Um recado de ${primeiroNome(video.aluno_nome)} para o papai. Centro Educacional Amadeus.`,
    // O card é impresso e permanente; não queremos esses links em buscador.
    robots: { index: false, follow: false },
  };
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export default async function VideoDiaDosPaisPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const video = await buscarVideo(codigo);
  if (!video) notFound();

  const [videoUrl, fotoUrl] = await Promise.all([
    assinarArquivo(video.video_path, VALIDADE_SEGUNDOS),
    assinarArquivo(video.foto_path, VALIDADE_SEGUNDOS),
  ]);

  const turma = [video.serie, video.turma && `Turma ${video.turma}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <main
      className="min-h-screen bg-[#063376] text-white"
      style={{ fontFamily: SERIF }}
    >
      {/* Brilho quente no topo, atrás da logo — dá profundidade sem
          criar emenda, porque a arte tem transparência de verdade. */}
      <div className="bg-[radial-gradient(90%_55%_at_50%_0%,rgba(242,176,20,0.16)_0%,transparent_70%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pb-10 pt-7">
          <header className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dia-dos-pais-titulo.png"
              alt="Feliz Dia dos Pais"
              className="w-56 max-w-[62%] sm:w-64"
            />
          </header>

          {/* Quem gravou */}
          <div className="mt-1 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
              Um recado de
            </p>
            <h1 className="mt-2 text-[26px] leading-tight text-white sm:text-[32px]">
              {video.aluno_nome}
            </h1>
            {turma && (
              <p className="mt-2 text-[13px] italic text-[#f2b014]">{turma}</p>
            )}
          </div>

          {/* Fio dourado — separador discreto, no lugar de mais espaço vazio */}
          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#f2b014]/60 to-transparent" />

          {/* O vídeo */}
          <div className="mt-5">
            {videoUrl ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={fotoUrl ?? undefined}
                className="aspect-[9/16] w-full rounded-2xl bg-black shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-[#f2b014]/40 sm:aspect-video"
              >
                <source src={videoUrl} type="video/mp4" />
                Seu navegador não consegue exibir este vídeo.
              </video>
            ) : (
              <div className="rounded-2xl bg-white/[0.06] px-6 py-12 text-center ring-1 ring-white/10">
                <p className="text-lg text-white">
                  O vídeo está sendo preparado
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Guarde o cartãozinho e tente de novo em algumas horas — o
                  link é permanente e não muda.
                </p>
              </div>
            )}
          </div>

          {/* Frase da campanha */}
          <blockquote className="mt-8 text-center text-[15px] italic leading-relaxed text-white/75">
            “Todo filho guarda um pouco do pai
            <br />
            no adulto em quem se torna.”
          </blockquote>

          <p className="mt-6 text-center text-sm leading-relaxed text-white/55">
            Este vídeo é seu, para guardar e rever sempre que quiser.
          </p>

          <footer className="mt-auto flex flex-col items-center gap-2.5 pt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-amadeus.png"
              alt=""
              className="size-10 rounded-full bg-white p-0.5"
            />
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">
              Centro Educacional Amadeus
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
