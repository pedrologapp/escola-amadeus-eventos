/**
 * Os vídeos que a TV pode passar (Pedro, 13/11/2026: "acrescentar o vídeo do Arboria, da introdução, mas sem áudio").
 * Ficam em public/tv/videos, em MP4 H.264 sem som (a TV da recepção toca H.264; sem som, o navegador deixa tocar sozinho).
 * A tela de vídeo dura o tamanho do vídeo.
 */
export interface VideoTv {
  id: string;
  nome: string;
  src: string;
  capa: string;
  segundos: number;
}

export const VIDEOS_TV: VideoTv[] = [
  {
    // a introdução do projeto Arboria (OneDrive: Arbória/Acervo/Experiencia/introducao/introducao-completa.mp4, 1:38,
    // a introdução com o fechamento),
    // sem o som; as legendas já vêm no vídeo, por isso o rodapé da TV desce enquanto ele passa
    id: "arboria-intro",
    nome: "Projeto Arboria: a introdução",
    src: "/tv/videos/arboria-intro.mp4",
    capa: "/tv/videos/arboria-intro.jpg",
    segundos: 99,
  },
];

export const videoTv = (id: unknown) => VIDEOS_TV.find((v) => v.id === id) ?? null;
