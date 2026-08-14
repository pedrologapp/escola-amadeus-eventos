import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  codigoValido,
  nomesDoCard,
  participantesDoCard,
  type VideoPais,
} from "@/lib/dia-dos-pais";
import { assinarVarios } from "@/lib/dia-dos-pais-storage";

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
    title: `Feliz Dia dos Pais! · ${nomesDoCard(video)}`,
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

  // Cada criança tem o seu recado, então a página mostra um player por
  // participante — o principal e cada irmão.
  const participantes = participantesDoCard(video);
  const assinados = await assinarVarios(
    participantes.flatMap((p) => [p.video_path, p.foto_path]),
    VALIDADE_SEGUNDOS,
  );
  const midias = participantes.map((p) => ({
    nome: p.nome,
    videoUrl: p.video_path ? assinados.get(p.video_path) : undefined,
    fotoUrl: p.foto_path ? assinados.get(p.foto_path) : undefined,
  }));
  const temIrmaos = midias.length > 1;

  return (
    <main
      className="min-h-screen bg-[#063376] text-white"
      style={{ fontFamily: SERIF }}
    >
      {/* Brilho quente no topo, atrás da logo — dá profundidade sem
          criar emenda, porque a arte tem transparência de verdade. */}
      <div className="bg-[radial-gradient(90%_55%_at_50%_0%,rgba(242,176,20,0.16)_0%,transparent_70%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pb-10 pt-7">
          {/* next/image e não <img>: o pai abre isso no 4G, e assim o
              Next serve WebP no tamanho da tela dele em vez dos PNGs
              cheios (que existem por causa da impressão). */}
          <header className="flex flex-col items-center">
            {/* Marca da escola primeiro: o pai abre e já sabe de onde veio.
                Versão negativa — o lockup normal tem texto azul-marinho,
                que sumiria no azul do fundo. */}
            <Image
              src="/logo-amadeus-negativa.png"
              alt="Centro Educacional Amadeus"
              width={1600}
              height={398}
              priority
              sizes="(max-width: 640px) 76vw, 288px"
              className="h-auto w-64 max-w-[76%] sm:w-72"
            />

            <Image
              src="/dia-dos-pais-titulo.png"
              alt="Feliz Dia dos Pais"
              width={900}
              height={751}
              priority
              sizes="(max-width: 640px) 70vw, 288px"
              className="mt-6 h-auto w-64 max-w-[70%] sm:w-72"
            />
          </header>

          {/* Quem gravou. O respiro grande separa da logo — colado, o
              "um recado de" parecia parte da arte. */}
          <div className="mt-7 text-center">
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#f2b014]">
              Um recado de
            </p>
            <h1 className="mt-3 text-[28px] font-bold leading-tight text-white sm:text-[34px]">
              {nomesDoCard(video)}
            </h1>
          </div>

          {/* Fio dourado — separador discreto, no lugar de mais espaço vazio */}
          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#f2b014]/60 to-transparent" />

          {/* Um player por criança */}
          <div className="mt-5 flex flex-col gap-8">
            {midias.map((m, i) => (
              <div key={i}>
                {/* Com irmãos, cada vídeo leva o nome de quem gravou —
                    senão o pai não sabe qual filho está vendo. */}
                {temIrmaos && (
                  <p className="mb-2 text-center text-[15px] font-bold text-[#f2b014]">
                    {m.nome}
                  </p>
                )}
                {m.videoUrl ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={m.fotoUrl}
                    // Sem proporção fixa: os vídeos são gravados no celular,
                    // em pé, e forçar 16:9 punha tarja preta dos dois lados.
                    className="mx-auto max-h-[72vh] w-auto max-w-full rounded-2xl bg-black shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-[#f2b014]/40"
                  >
                    <source src={m.videoUrl} type="video/mp4" />
                    Seu navegador não consegue exibir este vídeo.
                  </video>
                ) : (
                  <div className="rounded-2xl bg-white/[0.06] px-6 py-12 text-center ring-1 ring-white/10">
                    <p className="text-lg text-white">
                      O vídeo está sendo preparado
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      Guarde o cartãozinho e tente de novo em algumas horas —
                      o link é permanente e não muda.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Frase da campanha em lettering + a ilustração do pai com o
              filho. As duas artes têm transparência real, então caem
              direto no azul sem virar retângulo. */}
          <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <Image
              src="/dia-dos-pais-frase.png"
              alt="Todo filho guarda um pouco do pai no adulto em quem se torna."
              width={950}
              height={600}
              sizes="(max-width: 640px) 86vw, 340px"
              className="h-auto w-full max-w-[340px]"
            />
            <Image
              src="/dia-dos-pais-ilustracao.png"
              alt=""
              width={700}
              height={1018}
              sizes="(max-width: 640px) 45vw, 150px"
              className="h-auto w-40 sm:w-[150px]"
            />
          </div>

          <p className="mt-6 text-center text-[15px] leading-relaxed text-white/75">
            Este vídeo é seu, para guardar e rever sempre que quiser.
          </p>

          <footer className="mt-auto pt-10">
            <p className="text-center text-[12px] text-white/55">
              Este link é exclusivo da sua família. Guarde o cartão!
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
