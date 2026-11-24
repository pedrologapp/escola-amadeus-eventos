import type { ReactNode } from "react";
import { AMIGOS, ILHA_DO_AMIGO } from "@/lib/amigomagico/amigos";

/**
 * (23/11, Pedro) links nas mensagens do Diário da formatura viram clicáveis e abrem em nova aba
 * (na tela das professoras e no admin). Só http(s); o resto do texto continua texto.
 * Na tela das professoras, o link da ilha do amigo (ilha-do-amigo.vercel.app/?c=<slug>) vira o botão
 * "Abrir a ilha do <amigo>", que abre a ilha dentro do Diário (quem passa `abrirIlha`).
 */
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/** O slug da ilha, se o link for da ilha do amigo; senão null. */
export function slugDaIlha(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.origin !== new URL(ILHA_DO_AMIGO).origin) return null;
    const c = u.searchParams.get("c") ?? "";
    return /^[a-z0-9-]{1,40}$/.test(c) ? c : null;
  } catch {
    return null;
  }
}

export function nomeDoAmigo(slug: string): string {
  const a = AMIGOS.find((x) => x.slug === slug);
  return a?.amigo ? `d${a.doAmigo ?? "o"} ${a.amigo}` : "do amigo mágico";
}

export function comLinks(texto: string, className?: string, abrirIlha?: (slug: string) => void, classeBotao?: string): ReactNode[] {
  return texto.split(URL_RE).map((parte, i) => {
    if (i % 2 === 0) return parte;
    const limpo = parte.replace(/[.,;:!?)\]]+$/, ""); // pontuação colada no fim não faz parte do link
    const resto = parte.slice(limpo.length);
    const slug = abrirIlha ? slugDaIlha(limpo) : null;
    if (slug && abrirIlha) {
      return (
        <span key={i}>
          <button type="button" className={classeBotao} onClick={() => abrirIlha(slug)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 3.5 L16.5 10 L6 16.5 Z" />
            </svg>
            Abrir a ilha {nomeDoAmigo(slug)}
          </button>
          {resto}
        </span>
      );
    }
    return (
      <span key={i}>
        <a href={limpo} target="_blank" rel="noopener noreferrer" className={className}>
          {limpo}
        </a>
        {resto}
      </span>
    );
  });
}

/**
 * (23/11, Pedro: "mande só dizendo que chegou o amigo mágico para apresentar ao aluno") a mensagem de chegada do amigo
 * leva uma marca escondida no fim, "[[amigo:<slug>]]": a tela tira a marca e mostra o botão "Apresentar o <amigo>",
 * que abre a ilha dentro da conversa. O link da ilha não aparece escrito.
 */
const MARCA_AMIGO = /\s*\[\[amigo:([a-z0-9-]{1,40})\]\]\s*$/;

export function marcaDoAmigo(texto: string): { texto: string; slug: string | null } {
  const m = MARCA_AMIGO.exec(texto);
  return m ? { texto: texto.slice(0, m.index), slug: m[1] } : { texto, slug: null };
}

export function botaoApresentar(slug: string, revisado?: { slug: string; amigo: string | null; doAmigo: "a" | "o" } | null): string {
  const a = revisado && revisado.slug === slug ? revisado : AMIGOS.find((x) => x.slug === slug);
  return a?.amigo ? `Apresentar ${a.doAmigo ?? "o"} ${a.amigo}` : "Apresentar o amigo mágico";
}
