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
  tipo: string; // o que o amigo é ("gatinho", "carrinho"), para a revisão das professoras
  artigo: "a" | "o"; // da criança: "Mostrar para a Eva" / "para o Heitor"
  doAmigo?: "a" | "o"; // do amigo: "Apresentar a Luizinha" / "ilha da Luizinha" (padrão "o")
  ilha?: boolean; // false enquanto a ilha 3D dele não está pronta (o cartão aparece sem o botão); padrão true
}

export const AMIGOS: AmigoMagico[] = [
  { nome: "Eva Madilene de Melo Leonez Lima", slug: "eva", amigo: "Sheldon", tipo: "gatinho", artigo: "a" },
  { nome: "Benicio Luan Venceslau Souza De Araújo", slug: "benicio", amigo: "Vinicius", tipo: "menino fada", artigo: "o" },
  { nome: "Heitor Pyetro Souza da Silva", slug: "heitor", amigo: "Trovão", tipo: "cavalinho de fogo", artigo: "o" },
  { nome: "Jamily Santos Barros", slug: "jamily", amigo: null, tipo: "cachorrinha com asas", artigo: "a" },
  { nome: "João Lucas Pontes da Silva", slug: "joao-lucas", amigo: "Benício", tipo: "dragãozinho com asas", artigo: "o" },
  { nome: "Larissa Prado de Melo", slug: "larissa", amigo: "Arco-Íris", tipo: "unicórnio", artigo: "a" },
  { nome: "Maria Mayane Silva de Oliveira", slug: "maria-mayane", amigo: "José", tipo: "gatinho e passarinho", artigo: "a" },
  // Grupo V A, segunda leva (24/11/2026): ilhas 3D no ar desde 24/11
  { nome: "Benício Ravi Barbosa de Oliveira", slug: "benicio-ravi", amigo: "Eloah", tipo: "gatinha", artigo: "o", doAmigo: "a" },
  { nome: "Davi do Nascimento de Alexandria", slug: "davi", amigo: "Cauã", tipo: "carrinho", artigo: "o" },
  { nome: "Gabriel Emerenciano Mendes da Silva", slug: "gabriel", amigo: "Gabriel Magalhães", tipo: "robô", artigo: "o" },
  { nome: "Pedro Henrique de Moura Leão", slug: "pedro-henrique", amigo: "Nuvenzinha", tipo: "nuvem", artigo: "o", doAmigo: "a" },
  { nome: "Ryan Emerenciano Mendes da Silva", slug: "ryan", amigo: "Tablet", tipo: "celular", artigo: "o" },
  // Grupo V B (23/11/2026): imagens feitas a partir do que as professoras escreveram no Diário; ilhas 3D no ar desde 23/11
  { nome: "Maria Luiza Morais Borges", slug: "maria-luiza", amigo: "Luizinha", tipo: "menina de nuvem", artigo: "a", doAmigo: "a" },
  { nome: "Aurora Maria Borges da Fonseca Silva", slug: "aurora", amigo: "Rosinha", tipo: "boneca com asas", artigo: "a", doAmigo: "a" },
  { nome: "Raika Cândido de Lima", slug: "raika", amigo: "Alice", tipo: "borboleta", artigo: "a", doAmigo: "a" },
  { nome: "Arthur Mafra de Medeiros", slug: "arthur-mafra", amigo: "Furta-Cor", tipo: "árvore", artigo: "o" },
  { nome: "João Guilherme Inácio de Lira", slug: "joao-guilherme", amigo: "Fofinho", tipo: "cachorrinho", artigo: "o" },
  { nome: "Heitor Gabriel de Farias Silva", slug: "heitor-gabriel", amigo: "João", tipo: "gatinho com asas", artigo: "o" },
  { nome: "José Vicente Maia de Araújo", slug: "jose-vicente", amigo: "Cachoeira", tipo: "canguru", artigo: "o" },
  { nome: "Arthur Gregório Tavares da Silva", slug: "arthur-gregorio", amigo: "Astronauta", tipo: "cachorrinho", artigo: "o" },
  { nome: "Arthur Gabriel da Rocha Rufino", slug: "arthur-gabriel", amigo: "Plantinha", tipo: "plantinha", artigo: "o" },
  { nome: "Lucca Gabriel Santos Abdon", slug: "lucca", amigo: "Tião", tipo: "coelho", artigo: "o" },
  { nome: "Douglas Chirino Fernandez", slug: "douglas", amigo: "Ian", tipo: "carrinho com asas", artigo: "o" },
];

export const ILHA_DO_AMIGO = "https://ilha-do-amigo.vercel.app/";

/** O que a página do Diário recebe de cada amigo. */
export interface AmigoNoDiario {
  slug: string;
  amigo: string | null;
  tipo: string;
  artigo: "a" | "o";
  doAmigo: "a" | "o";
  adesivo: string; // /amigomagico/amigos/<slug>.webp
  ilha: string | null; // https://ilha-do-amigo.vercel.app/?c=<slug>; null enquanto a ilha não está pronta
}

const chave = (n: string) => String(n ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const porNome = new Map(AMIGOS.map((a) => [chave(a.nome), a]));

export function amigoDaCrianca(nomeCompleto: string): AmigoNoDiario | null {
  const a = porNome.get(chave(nomeCompleto));
  if (!a) return null;
  return { slug: a.slug, amigo: a.amigo, tipo: a.tipo, artigo: a.artigo, doAmigo: a.doAmigo ?? "o", adesivo: `/amigomagico/amigos/${a.slug}.webp`, ilha: a.ilha === false ? null : `${ILHA_DO_AMIGO}?c=${encodeURIComponent(a.slug)}` };
}

/** O nome que a professora confirmou na revisão vale no Diário (a ilha 3D é trocada à mão, pelo admin). */
export function comNomeRevisado(a: AmigoNoDiario | null, nomeRevisado: string | null | undefined): AmigoNoDiario | null {
  const n = String(nomeRevisado ?? "").trim();
  return a && n ? { ...a, amigo: n } : a;
}
