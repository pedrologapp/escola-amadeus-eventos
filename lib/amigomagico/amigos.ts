/**
 * Os amigos mágicos das crianças do Grupo V (formatura 18/12/2026). Cada criança que já tem o amigo pronto ganha, no
 * Diário, a borda amarela e o adesivo na lista da turma e, na conversa, o cartão com o botão que abre a ilha 3D
 * (projeto à parte: https://ilha-do-amigo.vercel.app/?c=<slug>).
 *
 * PARA ACRESCENTAR UMA CRIANÇA: uma linha aqui (nome completo como no cadastro, o slug da ilha, o nome do amigo ou null,
 * e "a"/"o" para "Mostrar para a Eva" / "para o Heitor") e o adesivo em public/amigomagico/amigos/<slug>.webp
 * (uns 300 px de largura, fundo transparente; script de exemplo: scripts no histórico do commit que criou este arquivo).
 */

export interface AmigoMagico {
  nome: string; // nome completo da criança (cadastro de alunos); comparado sem acento e sem maiúsculas
  slug: string; // ?c= da ilha 3D e nome do adesivo
  amigo: string | null; // null: o amigo ainda não tem nome
  artigo: "a" | "o";
}

export const AMIGOS: AmigoMagico[] = [
  { nome: "Eva Madilene de Melo Leonez Lima", slug: "eva", amigo: "Sheldon", artigo: "a" },
  { nome: "Benicio Luan Venceslau Souza De Araújo", slug: "benicio", amigo: "Vinicius", artigo: "o" },
  { nome: "Heitor Pyetro Souza da Silva", slug: "heitor", amigo: "Trovão", artigo: "o" },
  { nome: "Jamily Santos Barros", slug: "jamily", amigo: null, artigo: "a" },
  { nome: "João Lucas Pontes da Silva", slug: "joao-lucas", amigo: "Benício", artigo: "o" },
  { nome: "Larissa Prado de Melo", slug: "larissa", amigo: "Arco-Íris", artigo: "a" },
  { nome: "Maria Mayane Silva de Oliveira", slug: "maria-mayane", amigo: "José", artigo: "a" },
];

export const ILHA_DO_AMIGO = "https://ilha-do-amigo.vercel.app/";

/** O que a página do Diário recebe de cada amigo. */
export interface AmigoNoDiario {
  slug: string;
  amigo: string | null;
  artigo: "a" | "o";
  adesivo: string; // /amigomagico/amigos/<slug>.webp
  ilha: string; // https://ilha-do-amigo.vercel.app/?c=<slug>
}

const chave = (n: string) => String(n ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const porNome = new Map(AMIGOS.map((a) => [chave(a.nome), a]));

export function amigoDaCrianca(nomeCompleto: string): AmigoNoDiario | null {
  const a = porNome.get(chave(nomeCompleto));
  if (!a) return null;
  return { slug: a.slug, amigo: a.amigo, artigo: a.artigo, adesivo: `/amigomagico/amigos/${a.slug}.webp`, ilha: `${ILHA_DO_AMIGO}?c=${encodeURIComponent(a.slug)}` };
}
