import "server-only";

import { unstable_cache } from "next/cache";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoTv } from "@/lib/tv-videos";
import { DESAFIOS, INTELIGENCIAS_TV, PALAVRAS, dicaDoTempo, tempoEmPalavras } from "@/lib/tv-conteudo";

/**
 * TV Amadeus (29/09/2026): a TV da recepção roda um roteiro em loop que se
 * monta de novo a cada volta, com o que é automático (aniversariantes do dia,
 * próximo evento, prazo da rematrícula, data comemorativa) e o que a equipe
 * cadastra em /admin/comunicacao/tv (avisos, recados, agenda, frases,
 * curiosidades). Bloco sem conteúdo no dia some sozinho.
 */

const FUSO = "America/Fortaleza";

export type TipoItem = "aviso" | "recado" | "agenda" | "frase" | "curiosidade" | "comemoracao" | "rodape" | "foto" | "conquista" | "pessoa";

export const TIPOS: { id: TipoItem; nome: string; dica: string }[] = [
  { id: "aviso", nome: "Aviso em destaque", dica: "Ocupa a tela toda, com título grande. Ex.: Arena Arbória, resultado na quinta." },
  { id: "recado", nome: "Recado curto", dica: "Entra na lista “Recados da coordenação”. Ex.: traga a garrafinha com nome." },
  { id: "agenda", nome: "Agenda da semana", dica: "Algo marcado num dia. Aparece na agenda da semana daquele dia." },
  { id: "frase", nome: "Frase", dica: "Gira sozinha, uma por dia. Palavra entre *asteriscos* sai em amarelo." },
  { id: "curiosidade", nome: "Você sabia?", dica: "Gira sozinha, uma por dia. Trecho entre *asteriscos* sai em destaque." },
  { id: "rodape", nome: "Frase do rodapé", dica: "Passa na faixa de notícias do rodapé, da direita para a esquerda. Ex.: Matrículas 2027 abertas." },
  { id: "comemoracao", nome: "Data comemorativa", dica: "Aparece na saudação naquele dia, todo ano." },
  { id: "foto", nome: "Foto de evento", dica: "As fotos de um evento, com o nome dele. Passam uma depois da outra." },
  { id: "conquista", nome: "Conquista", dica: "Um aluno ou turma que ganhou algo, com foto se tiver." },
  { id: "pessoa", nome: "Nossa equipe", dica: "Foto, nome e função de alguém da equipe. Passa uma pessoa por dia." },
];

/** equipe = só passa se alguém da escola colocar o conteúdo; tipo = o que se cadastra para ele. */
export const BLOCOS: Record<string, { nome: string; origem: string; equipe?: TipoItem }> = {
  saudacao: { nome: "Saudação", origem: "Bom dia/tarde/noite, data e a comemoração do dia" },
  aniversariantes: { nome: "Aniversariantes", origem: "Automático: quem faz aniversário hoje (Activesoft)" },
  avisos: { nome: "Avisos em destaque", origem: "Cada aviso é uma tela inteira", equipe: "aviso" },
  recados: { nome: "Recados da coordenação", origem: "Lembretes curtos para pais e alunos", equipe: "recado" },
  evento: { nome: "Próximo evento", origem: "Automático: o próximo evento publicado, com contagem" },
  promo: { nome: "Matrículas 2027", origem: "Automático: a matrícula antecipada até o prazo; depois, matrículas abertas" },
  agenda: { nome: "Agenda da semana", origem: "Provas, passeios, reuniões de cada dia", equipe: "agenda" },
  sabia: { nome: "Você sabia?", origem: "Gira sozinho, um por dia (já tem uma lista pronta)", equipe: "curiosidade" },
  frase: { nome: "Frase do dia", origem: "Gira sozinha, uma por dia (já tem uma lista pronta)", equipe: "frase" },
  qr: { nome: "QR codes para os pais", origem: "Folder 2027 e pesquisa de satisfação" },
  formatura: { nome: "Formatura 5º ano", origem: "Tela fixa com o aviãozinho" },
  fim: { nome: "Encerramento", origem: "Logo dos 30 anos" },
  // as novas (Pedro, 16/11/2026)
  tempo: { nome: "O tempo em Natal", origem: "Automático: a previsão do dia, com uma dica" },
  contagem: { nome: "Contagem regressiva", origem: "Automático: quantos dias faltam para a próxima data da agenda ou data comemorativa" },
  desafio: { nome: "Desafio Amadeus", origem: "Automático: uma pergunta por dia e a resposta logo depois" },
  palavra: { nome: "Palavra do dia em inglês", origem: "Automático: uma palavra por dia, com a tradução e uma frase" },
  inteligencia: { nome: "Inteligência do dia", origem: "Automático: uma das 8 inteligências do Arboria por dia, com algo para experimentar" },
  fotos: { nome: "Fotos dos eventos", origem: "Cada evento é uma tela que passa as fotos dele, uma depois da outra", equipe: "foto" },
  conquistas: { nome: "Conquistas", origem: "Alunos e turmas que ganharam algo", equipe: "conquista" },
  equipe: { nome: "Nossa equipe", origem: "Uma pessoa da equipe por dia, com foto", equipe: "pessoa" },
};

/**
 * As telas novas de 16/11/2026: se ainda não têm linha em tv_blocos, a TV usa este lugar e tempo (a ordem fica entre
 * as de sempre). A linha nasce quando a escola liga, desliga ou muda a ordem no gerenciador.
 */
export const NOVOS: BlocoTv[] = [
  { id: "tempo", ativo: true, ordem: 1.5, segundos: 11 },
  { id: "contagem", ativo: true, ordem: 5.5, segundos: 11 },
  { id: "fotos", ativo: true, ordem: 7.2, segundos: 9 },
  { id: "conquistas", ativo: true, ordem: 7.4, segundos: 12 },
  { id: "desafio", ativo: true, ordem: 7.6, segundos: 14 },
  { id: "palavra", ativo: true, ordem: 8.3, segundos: 11 },
  { id: "equipe", ativo: true, ordem: 8.5, segundos: 11 },
  { id: "inteligencia", ativo: true, ordem: 8.7, segundos: 13 },
];
const comNovos = (blocos: BlocoTv[]) => [...blocos, ...NOVOS.filter((n) => !blocos.some((b) => b.id === n.id))].sort((a, b) => a.ordem - b.ordem);

/** Prazo da matrícula antecipada (o mesmo do folder: 28 de outubro). */
export const PRAZO_PROMO = "2026-10-28";

export interface ItemTv {
  id: string;
  tipo: TipoItem;
  titulo: string;
  texto: string;
  icone: string | null;
  data: string | null;
  inicio: string | null;
  fim: string | null;
  ativo: boolean;
  /** a foto (fotos, conquistas e equipe), migração 0081 */
  imagem?: string | null;
}

export interface BlocoTv {
  id: string;
  ativo: boolean;
  ordem: number;
  segundos: number;
}

/** Telas criadas pela escola a partir de um formato pronto (tabela tv_telas, migração 0078). */
export type FormatoTela = "aviso" | "recado" | "frase" | "sabia" | "celebracao" | "programacao" | "contagem" | "foto" | "video";

export interface TelaTv {
  id: string;
  formato: FormatoTela;
  campos: Record<string, unknown>;
  ordem: number;
  segundos: number;
  inicio: string | null;
  fim: string | null;
  ativo: boolean;
}

export interface Aniversariante {
  nome: string;
  turma: string;
  quando: string | null; // null = hoje; "sábado" etc.
}

export interface Cena {
  id: string; // bloco
  chave: string; // única (um aviso por cena)
  segundos: number;
  dados: Record<string, unknown>;
}

export interface RoteiroTv {
  hoje: string;
  cenas: Cena[];
  atualizado: string;
  /** as frases da faixa de notícias do rodapé (12/11/2026) */
  rodape?: string[];
  /** o modo evento está ligado hoje (12/11/2026) */
  modoEvento?: boolean;
}

export const hojeLocal = () => new Date().toLocaleDateString("en-CA", { timeZone: FUSO });

export function valeHoje(i: ItemTv, hoje: string) {
  return i.ativo && (!i.inicio || i.inicio <= hoje) && (!i.fim || i.fim >= hoje);
}

export function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const diaDoAno = (iso: string) => Math.floor((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${iso.slice(0, 4)}-01-01T00:00:00Z`)) / 864e5);

export async function lerItensEBlocos() {
  const db = createAdminClient();
  const colunas = "id, tipo, titulo, texto, icone, data, inicio, fim, ativo";
  const [r1, { data: blocos, error: e2 }] = await Promise.all([
    db.from("tv_itens").select(`${colunas}, imagem`).order("criado_em", { ascending: true }),
    db.from("tv_blocos").select("id, ativo, ordem, segundos").order("ordem"),
  ]);
  // sem a coluna da foto (migração 0081 ainda não aplicada): lê como antes
  const { data: itens, error: e1 } = r1.error?.code === "42703" ? await db.from("tv_itens").select(colunas).order("criado_em", { ascending: true }) : r1;
  // banco fora do ar (ex.: Supabase pausado): falha de verdade, para o roteiro vazio não ficar guardado o dia todo
  if (e1 || e2) throw new Error(`TV: não consegui ler o banco (${(e1 ?? e2)?.message})`);
  return { itens: (itens ?? []) as ItemTv[], blocos: comNovos((blocos ?? []) as BlocoTv[]) };
}

/** As telas criadas. null = a tabela ainda não existe (migração 0078 não aplicada): a TV segue como antes. */
export async function lerTelas(): Promise<TelaTv[] | null> {
  const { data, error } = await createAdminClient()
    .from("tv_telas")
    .select("id, formato, campos, ordem, segundos, inicio, fim, ativo")
    .order("ordem")
    .order("criado_em");
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || /tv_telas/.test(error.message)) return null;
    throw new Error(`TV: telas (${error.message})`);
  }
  return (data ?? []).map((t) => ({ ...t, ordem: Number(t.ordem) })) as TelaTv[];
}

async function aniversariantes(hoje: string): Promise<Aniversariante[]> {
  const db = createAdminClient();
  // na segunda, também os do fim de semana
  const semana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const desde = semana === 1 ? somaDias(hoje, -2) : hoje;
  const { data, error } = await db
    .from("aniversario_envios")
    .select("data, tipo, pessoa_ref, nome")
    .gte("data", desde)
    .lte("data", hoje)
    .not("pessoa_ref", "like", "teste:%");
  if (error) throw new Error(`TV: aniversariantes (${error.message})`);
  const vistos = new Map<string, { data: string; tipo: string; nome: string; ref: string }>();
  for (const r of data ?? []) if (!vistos.has(r.pessoa_ref)) vistos.set(r.pessoa_ref, { data: r.data, tipo: r.tipo, nome: r.nome, ref: r.pessoa_ref });
  const ids = [...vistos.values()].filter((v) => v.ref.startsWith("aluno:")).map((v) => Number(v.ref.slice(6)));
  const { data: alunos } = ids.length
    ? await db.from("alunos").select("erp_aluno_id, serie, turma, casa").in("erp_aluno_id", ids)
    : { data: [] as { erp_aluno_id: number; serie: string; turma: string; casa: string | null }[] };
  const porId = new Map((alunos ?? []).map((a) => [a.erp_aluno_id, a]));
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return [...vistos.values()]
    .sort((a, b) => (a.data === b.data ? a.nome.localeCompare(b.nome) : b.data.localeCompare(a.data)))
    .map((v) => {
      let turma = "Equipe Amadeus";
      if (v.ref.startsWith("aluno:")) {
        const a = porId.get(Number(v.ref.slice(6)));
        turma = a ? [`${a.serie} ${a.turma}`.trim(), a.casa ? `Casa ${a.casa}` : ""].filter(Boolean).join(" · ") : "Aluno";
      }
      return { nome: v.nome, turma, quando: v.data === hoje ? null : DIAS[new Date(`${v.data}T12:00:00Z`).getUTCDay()] };
    });
}

async function proximoEvento(hoje: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("eventos")
    .select("nome, data_evento, hora_evento, local, imagem_capa_url")
    .eq("status", "publicado")
    .gte("data_evento", hoje)
    .order("data_evento")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const nome = String(data.nome).replace(/\s+\d{4}$/, "");
  // ilustração 3D quando temos uma que combina; senão a capa do evento num cartão
  const ilustracao = /crian/i.test(nome) ? "/paineis/ilustracoes/dia-das-criancas.jpg" : null;
  return { nome, data: data.data_evento as string, local: (data.local as string | null) ?? "", capa: (data.imagem_capa_url as string | null) ?? null, ilustracao };
}

/**
 * O tempo em Natal hoje (Open-Meteo, grátis e sem chave). Vem uma vez por dia, junto com o roteiro guardado.
 * Se a internet falhar, a tela some naquele dia.
 */
async function tempoEmNatal() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=-5.7945&longitude=-35.2110&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FFortaleza&forecast_days=1";
  const r = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!r.ok) return null;
  const j = (await r.json()) as { daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: (number | null)[] } };
  const d = j.daily;
  if (!d?.temperature_2m_max?.length) return null;
  const max = Math.round(d.temperature_2m_max[0]);
  const min = Math.round(d.temperature_2m_min?.[0] ?? max);
  const chuva = Math.round(d.precipitation_probability_max?.[0] ?? 0);
  const ceu = tempoEmPalavras(d.weather_code?.[0] ?? 1);
  return { ceu: ceu.txt, icone: ceu.icone, max, min, chuva, dica: dicaDoTempo(max, chuva) };
}

/**
 * Contagem regressiva: a próxima data que vale a pena esperar, de 2 a 45 dias daqui: algo da agenda ou uma data
 * comemorativa (todo ano). Não repete o próximo evento, que já tem a contagem dele.
 */
function proximaData(hoje: string, itens: ItemTv[], dataEvento: string | null) {
  const limite = somaDias(hoje, 45);
  const ano = Number(hoje.slice(0, 4));
  const candidatos: { nome: string; data: string; icone: string | null }[] = [];
  for (const i of itens) {
    if (!i.ativo || !i.data) continue;
    if (i.tipo === "agenda") candidatos.push({ nome: i.titulo, data: i.data, icone: i.icone });
    if (i.tipo === "comemoracao") {
      const mmdd = i.data.slice(5);
      const esteAno = `${ano}-${mmdd}`;
      candidatos.push({ nome: i.titulo, data: esteAno >= hoje ? esteAno : `${ano + 1}-${mmdd}`, icone: i.icone });
    }
  }
  const prox = candidatos
    .filter((x) => x.data >= somaDias(hoje, 2) && x.data <= limite && x.data !== dataEvento)
    .sort((a, b) => a.data.localeCompare(b.data))[0];
  return prox ? { nome: prox.nome.replace(/\*/g, ""), data: prox.data, icone: prox.icone } : null;
}

/** n itens diferentes da lista, começando pelo do dia (gira um por dia). */
function varias<T>(lista: T[], n: number, hoje = hojeLocal()): T[] {
  if (!lista.length) return [];
  const k = diaDoAno(hoje) * n;
  return Array.from({ length: Math.min(n, lista.length) }, (_, i) => lista[(k + i) % lista.length]);
}

const qr = (url: string) => QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#12307A", light: "#FFFFFF" } });

const horaLocal = () => Number(new Date().toLocaleString("en-US", { timeZone: FUSO, hour: "numeric", hour12: false })) % 24;

/**
 * O roteiro do dia fica pronto e guardado: é gerado uma vez de madrugada e
 * de novo às 7h (quando a rotina dos aniversários grava quem faz anos hoje),
 * e na hora em que alguém muda algo no admin (etiqueta "tv"). A TV pede o
 * roteiro a cada volta, mas recebe o guardado, sem ir ao banco. As contagens
 * ("faltam 16 dias") e o relógio são feitos na própria TV.
 */
export async function roteiroDoDia(): Promise<RoteiroTv> {
  const hoje = hojeLocal();
  const turno = horaLocal() >= 7 ? "dia" : "madrugada";
  try {
    // o modo evento muda com o horário: a chave do roteiro guardado diz se ele vale agora (consulta pequena, a cada volta)
    const evento = modoEventoAgora(await lerModoEvento().catch(() => null), hoje);
    return await unstable_cache(() => montarRoteiro(hoje, evento), ["tv-roteiro", "v14", hoje, turno, evento ? "evento" : "normal"], { tags: [ETIQUETA_TV], revalidate: 60 * 60 * 24 })();
  } catch (e) {
    // nada fica guardado: a TV mostra só o relógio e pede de novo em 1 minuto (app/admin/tv/player.tsx)
    console.error(e);
    return { hoje, cenas: [], atualizado: new Date().toISOString() };
  }
}

export const ETIQUETA_TV = "tv";

/** Segunda a sexta da semana de hoje (no fim de semana, a semana que vem). */
export function diasDaSemana(hoje: string) {
  const semana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const segunda = somaDias(hoje, semana === 0 ? 1 : semana === 6 ? 2 : 1 - semana);
  return [0, 1, 2, 3, 4].map((n) => somaDias(segunda, n));
}

/** A TV do site público: a mesma do dia, sem nome de aluno (tira os aniversariantes). */
export async function roteiroPublico(): Promise<RoteiroTv> {
  const r = await roteiroDoDia();
  return { ...r, cenas: r.cenas.filter((c) => c.id !== "aniversariantes") };
}

/** Monta as cenas do dia. */
/**
 * Modo evento (Pedro, 12/11/2026): um botão no gerenciador. Fica guardado como uma linha de tv_blocos com id
 * "modo-evento": ativo = ligado, ordem = o dia em que vale (AAAAMMDD), então desliga sozinho no dia seguinte.
 * Ligado, a TV continua passando tudo, mas o "Você sabia?" passa as curiosidades do evento (curiosidades com
 * data = o dia do evento), todas, uma tela cada. O evento de hoje ou de amanhã vem logo depois da saudação.
 */
export const MODO_EVENTO = "modo-evento";
export const modoEventoDia = (blocos: BlocoTv[]): string | null => modoEventoDe(blocos)?.dia ?? null;

/**
 * O modo evento guardado: o dia (em "ordem", AAAAMMDD) e o horário (em "segundos": início em minutos x 10000 + fim em
 * minutos; 0 = o dia todo). Fora do horário a TV volta sozinha ao normal (Pedro, 12/11/2026).
 */
export interface ModoEventoTv { dia: string; inicio: number | null; fim: number | null }
export function modoEventoDe(blocos: BlocoTv[]): ModoEventoTv | null {
  const b = blocos.find((x) => x.id === MODO_EVENTO);
  if (!b || !b.ativo || !b.ordem) return null;
  const t = String(b.ordem);
  const h = Number(b.segundos) || 0;
  return { dia: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`, inicio: h ? Math.floor(h / 10000) : null, fim: h ? h % 10000 : null };
}
/** Os minutos de agora no fuso da escola (0 a 1439). */
const minutosLocal = () => {
  const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  return (h % 24) * 60 + m;
};
/** O modo evento vale agora? (o dia certo e, se tiver horário, dentro dele) */
export function modoEventoAgora(me: ModoEventoTv | null, hoje: string, minutos = minutosLocal()) {
  if (!me || me.dia !== hoje) return false;
  if (me.inicio === null || me.fim === null) return true;
  return minutos >= me.inicio && minutos < me.fim;
}
async function lerModoEvento(): Promise<ModoEventoTv | null> {
  const { data } = await createAdminClient().from("tv_blocos").select("id, ativo, ordem, segundos").eq("id", MODO_EVENTO).maybeSingle();
  return data ? modoEventoDe([data as BlocoTv]) : null;
}

async function montarRoteiro(hoje: string, eventoAgora = false): Promise<RoteiroTv> {
  const [{ itens, blocos: todosBlocos }, telas] = await Promise.all([lerItensEBlocos(), lerTelas()]);
  // com as telas criadas, a formatura fixa vira uma tela (formato celebração) e o bloco antigo sai
  const modoEvento = eventoAgora;
  const blocos = (telas ? todosBlocos.filter((b) => b.id !== "formatura") : todosBlocos).filter((b) => b.id !== MODO_EVENTO);
  const valem = itens.filter((i) => valeHoje(i, hoje));
  const de = (t: TipoItem) => valem.filter((i) => i.tipo === t);
  const [nivers, evento, tempo, qrFolder, qrPesquisa] = await Promise.all([
    aniversariantes(hoje), // se o banco falhar, o roteiro não é guardado e a TV tenta de novo
    proximoEvento(hoje).catch(() => null),
    tempoEmNatal().catch(() => null),
    qr("https://www.escolaamadeus.com/conheca"), // folder SEM valores (público)
    qr("https://pesquisa.escolaamadeus.com/escolar"),
  ]);

  const mmdd = hoje.slice(5);
  const comemoracao = itens.find((i) => i.tipo === "comemoracao" && i.ativo && i.data?.slice(5) === mmdd && (!i.fim || i.fim >= hoje)) ?? null;
  const gira = (lista: ItemTv[]) => (lista.length ? lista[diaDoAno(hoje) % lista.length] : null);

  const diasSemana = diasDaSemana(hoje);
  const agenda = itens.filter((i) => i.tipo === "agenda" && i.ativo && i.data && diasSemana.includes(i.data));

  // blocos e telas criadas na mesma fila, pela ordem
  const fila: ({ tipo: "bloco"; b: BlocoTv; ordem: number } | { tipo: "tela"; t: TelaTv; ordem: number })[] = [
    ...blocos.map((b) => ({ tipo: "bloco" as const, b, ordem: b.ordem })),
    ...(telas ?? []).map((t) => ({ tipo: "tela" as const, t, ordem: t.ordem })),
  ].sort((x, y) => x.ordem - y.ordem);

  const cenas: Cena[] = [];
  for (const f of fila) {
    if (f.tipo === "tela") {
      const t = f.t;
      if (t.ativo && (!t.inicio || t.inicio <= hoje) && (!t.fim || t.fim >= hoje)) {
        // a tela de vídeo dura o tamanho do vídeo (e some se o vídeo não existir mais)
        const v = t.formato === "video" ? videoTv(t.campos.video) : null;
        if (t.formato !== "video" || v) cenas.push({ id: "tela", chave: `tela:${t.id}`, segundos: v ? v.segundos : t.segundos, dados: { formato: t.formato, ...t.campos } });
      }
      continue;
    }
    const b = f.b;
    if (!b.ativo) continue;
    const c = (dados: Record<string, unknown>, chave = b.id) => cenas.push({ id: b.id, chave, segundos: b.segundos, dados });
    switch (b.id) {
      case "saudacao":
        // no modo evento, a saudação vira as boas-vindas ao evento do dia (o nome vem da data comemorativa)
        c({ comemoracao: comemoracao ? { titulo: comemoracao.titulo, icone: comemoracao.icone, texto: comemoracao.texto } : null, evento: modoEvento && !!comemoracao });
        break;
      case "aniversariantes":
        // um aniversariante por tela: cada um tem o seu momento (Pedro, 12/11/2026)
        nivers.slice(0, 8).forEach((p, i) => c({ pessoa: p }, `aniversariantes:${i}`));
        break;
      case "avisos":
        for (const a of de("aviso")) c({ titulo: a.titulo, texto: a.texto, icone: a.icone }, `aviso:${a.id}`);
        break;
      case "recados":
        if (de("recado").length) c({ lista: de("recado").slice(0, 4).map((r) => ({ texto: r.titulo || r.texto, icone: r.icone })) });
        break;
      case "evento":
        if (evento) c(evento);
        break;
      case "promo":
        // até o prazo, a matrícula antecipada; depois, "matrículas 2027 abertas" (Pedro, 16/11/2026)
        c({ prazo: hoje <= PRAZO_PROMO ? PRAZO_PROMO : null, qr: qrFolder });
        break;
      case "agenda":
        if (agenda.length) c({ dias: diasSemana.map((d) => ({ data: d, itens: agenda.filter((i) => i.data === d).map((i) => i.titulo) })) });
        break;
      case "sabia": {
        // as curiosidades com dia marcado são as do evento: passam todas no modo evento, e nunca na roda comum
        const doEvento = de("curiosidade").filter((i) => i.data === hoje);
        if (modoEvento && doEvento.length) {
          for (const i of doEvento) c({ texto: i.titulo, evento: true }, `sabia:${i.id}`);
          break;
        }
        // três curiosidades por volta: a primeira aqui, as outras espalhadas pela volta (Pedro, 16/11/2026)
        varias(de("curiosidade").filter((i) => !i.data), 3).forEach((s, k) => c({ texto: s.titulo }, k ? `extra:sabia:${k}` : b.id));
        break;
      }
      case "frase": {
        varias(de("frase"), 2).forEach((f, k) => c({ texto: f.titulo }, k ? `extra:frase:${k}` : b.id));
        break;
      }
      case "tempo":
        if (tempo) c(tempo);
        break;
      case "contagem": {
        const prox = proximaData(hoje, itens, evento?.data ?? null);
        if (prox) c(prox);
        break;
      }
      case "desafio": {
        const d = DESAFIOS[diaDoAno(hoje) % DESAFIOS.length];
        c({ pergunta: d.p, resposta: d.r });
        break;
      }
      case "palavra":
        c({ ...PALAVRAS[diaDoAno(hoje) % PALAVRAS.length] });
        break;
      case "inteligencia":
        c({ ...INTELIGENCIAS_TV[diaDoAno(hoje) % INTELIGENCIAS_TV.length] });
        break;
      case "fotos": {
        // álbuns de evento (Pedro, 16/11/2026: "um espaço para eventos esporádicos, para colocar as fotos que recebemos"):
        // as fotos com o mesmo nome de evento formam um álbum; cada álbum é uma tela que passa as fotos, uma a cada 4 s
        const albuns = new Map<string, string[]>();
        for (const f of de("foto")) {
          if (!f.imagem) continue;
          const nome = f.titulo.trim() || "Fotos da escola";
          albuns.set(nome, [...(albuns.get(nome) ?? []), f.imagem]);
        }
        let n = 0;
        for (const [nome, todas] of albuns) {
          // até 12 fotos por volta; com mais, cada dia começa de um ponto diferente
          const imagens = todas.length <= 12 ? todas : varias(todas, 12);
          cenas.push({ id: b.id, chave: `album:${n++}`, segundos: Math.min(60, Math.max(8, imagens.length * 4)), dados: { legenda: nome, imagens } });
        }
        break;
      }
      case "conquistas":
        for (const q of de("conquista").slice(0, 4)) c({ titulo: q.titulo, texto: q.texto, imagem: q.imagem ?? null }, `conquista:${q.id}`);
        break;
      case "equipe": {
        // uma pessoa por dia
        const p = gira(de("pessoa").filter((i) => i.imagem));
        if (p) c({ nome: p.titulo, funcao: p.texto, imagem: p.imagem });
        break;
      }
      case "qr":
        c({ folder: qrFolder, pesquisa: qrPesquisa });
        break;
      default:
        c({});
    }
  }
  // modo evento: as curiosidades do evento se espalham pela volta, uma a cada duas telas (Pedro, 12/11/2026)
  if (modoEvento) {
    const doEvento = cenas.filter((x) => x.chave.startsWith("sabia:"));
    if (doEvento.length) {
      const resto = cenas.filter((x) => !x.chave.startsWith("sabia:"));
      const fimIdx = resto.findIndex((x) => x.id === "fim");
      const antesDoFim = fimIdx >= 0 ? resto.slice(0, fimIdx) : resto;
      const depois = fimIdx >= 0 ? resto.slice(fimIdx) : [];
      cenas.length = 0;
      antesDoFim.forEach((x, i) => { cenas.push(x); if (i % 2 === 1 && doEvento.length) cenas.push(doEvento.shift()!); });
      cenas.push(...doEvento, ...depois);
    }
  }
  // as curiosidades e frases a mais se espalham pela volta, uma a cada três telas, antes do encerramento
  const extras = cenas.filter((x) => x.chave.startsWith("extra:"));
  if (extras.length) {
    const resto = cenas.filter((x) => !x.chave.startsWith("extra:"));
    const fimIdx = resto.findIndex((x) => x.id === "fim");
    const corpo = fimIdx >= 0 ? resto.slice(0, fimIdx) : resto;
    // em lugares espaçados e nunca colada numa tela do mesmo tipo (curiosidade ao lado de curiosidade)
    extras.sort((a, b) => a.chave.slice(-1).localeCompare(b.chave.slice(-1)));
    extras.forEach((e, k) => {
      let p = Math.max(1, Math.round(((k + 1) * corpo.length) / (extras.length + 1)));
      while (p < corpo.length && (corpo[p - 1]?.id === e.id || corpo[p]?.id === e.id)) p++;
      corpo.splice(p, 0, e);
    });
    cenas.length = 0;
    cenas.push(...corpo, ...(fimIdx >= 0 ? resto.slice(fimIdx) : []));
  }
  // o evento de hoje ou de amanhã é o assunto do dia: vem logo depois da saudação
  const iEv = cenas.findIndex((x) => x.id === "evento");
  if (iEv > 0 && String((cenas[iEv].dados as { data?: string }).data ?? "") <= somaDias(hoje, 1)) {
    const [ev] = cenas.splice(iEv, 1);
    const iSa = cenas.findIndex((x) => x.id === "saudacao");
    cenas.splice(iSa + 1, 0, ev);
  }
  const rodape = valem.filter((i) => i.tipo === "rodape").map((i) => i.titulo.split("*").join("")).filter(Boolean);
  return { hoje, cenas, atualizado: new Date().toISOString(), rodape, modoEvento };
}
