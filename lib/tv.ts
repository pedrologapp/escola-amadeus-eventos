import "server-only";

import { unstable_cache } from "next/cache";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * TV Amadeus (29/09/2026): a TV da recepção roda um roteiro em loop que se
 * monta de novo a cada volta, com o que é automático (aniversariantes do dia,
 * próximo evento, prazo da rematrícula, data comemorativa) e o que a equipe
 * cadastra em /admin/comunicacao/tv (avisos, recados, agenda, frases,
 * curiosidades). Bloco sem conteúdo no dia some sozinho.
 */

const FUSO = "America/Fortaleza";

export type TipoItem = "aviso" | "recado" | "agenda" | "frase" | "curiosidade" | "comemoracao";

export const TIPOS: { id: TipoItem; nome: string; dica: string }[] = [
  { id: "aviso", nome: "Aviso em destaque", dica: "Ocupa a tela toda, com título grande. Ex.: Arena Arbória, resultado na quinta." },
  { id: "recado", nome: "Recado curto", dica: "Entra na lista “Recados da coordenação”. Ex.: traga a garrafinha com nome." },
  { id: "agenda", nome: "Agenda da semana", dica: "Algo marcado num dia. Aparece na agenda da semana daquele dia." },
  { id: "frase", nome: "Frase", dica: "Gira sozinha, uma por dia. Palavra entre *asteriscos* sai em amarelo." },
  { id: "curiosidade", nome: "Você sabia?", dica: "Gira sozinha, uma por dia. Trecho entre *asteriscos* sai em destaque." },
  { id: "comemoracao", nome: "Data comemorativa", dica: "Aparece na saudação naquele dia, todo ano." },
];

/** equipe = só passa se alguém da escola colocar o conteúdo; tipo = o que se cadastra para ele. */
export const BLOCOS: Record<string, { nome: string; origem: string; equipe?: TipoItem }> = {
  saudacao: { nome: "Saudação", origem: "Bom dia/tarde/noite, data e a comemoração do dia" },
  aniversariantes: { nome: "Aniversariantes", origem: "Automático: quem faz aniversário hoje (Activesoft)" },
  avisos: { nome: "Avisos em destaque", origem: "Cada aviso é uma tela inteira", equipe: "aviso" },
  recados: { nome: "Recados da coordenação", origem: "Lembretes curtos para pais e alunos", equipe: "recado" },
  evento: { nome: "Próximo evento", origem: "Automático: o próximo evento publicado, com contagem" },
  promo: { nome: "Matrícula antecipada", origem: "Automático: some sozinho depois do prazo" },
  agenda: { nome: "Agenda da semana", origem: "Provas, passeios, reuniões de cada dia", equipe: "agenda" },
  sabia: { nome: "Você sabia?", origem: "Gira sozinho, um por dia (já tem uma lista pronta)", equipe: "curiosidade" },
  frase: { nome: "Frase do dia", origem: "Gira sozinha, uma por dia (já tem uma lista pronta)", equipe: "frase" },
  qr: { nome: "QR codes para os pais", origem: "Folder 2027 e pesquisa de satisfação" },
  formatura: { nome: "Formatura 5º ano", origem: "Tela fixa com o aviãozinho" },
  fim: { nome: "Encerramento", origem: "Logo dos 30 anos" },
};

/** Prazo da matrícula antecipada (o mesmo do folder: 30 de outubro). */
const PRAZO_PROMO = "2026-10-30";

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
}

export interface BlocoTv {
  id: string;
  ativo: boolean;
  ordem: number;
  segundos: number;
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
}

export const hojeLocal = () => new Date().toLocaleDateString("en-CA", { timeZone: FUSO });

function valeHoje(i: ItemTv, hoje: string) {
  return i.ativo && (!i.inicio || i.inicio <= hoje) && (!i.fim || i.fim >= hoje);
}

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const diaDoAno = (iso: string) => Math.floor((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${iso.slice(0, 4)}-01-01T00:00:00Z`)) / 864e5);

export async function lerItensEBlocos() {
  const db = createAdminClient();
  const [{ data: itens }, { data: blocos }] = await Promise.all([
    db.from("tv_itens").select("id, tipo, titulo, texto, icone, data, inicio, fim, ativo").order("criado_em", { ascending: true }),
    db.from("tv_blocos").select("id, ativo, ordem, segundos").order("ordem"),
  ]);
  return { itens: (itens ?? []) as ItemTv[], blocos: (blocos ?? []) as BlocoTv[] };
}

async function aniversariantes(hoje: string): Promise<Aniversariante[]> {
  const db = createAdminClient();
  // na segunda, também os do fim de semana
  const semana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const desde = semana === 1 ? somaDias(hoje, -2) : hoje;
  const { data } = await db
    .from("aniversario_envios")
    .select("data, tipo, pessoa_ref, nome")
    .gte("data", desde)
    .lte("data", hoje)
    .not("pessoa_ref", "like", "teste:%");
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

const qr = (url: string) => QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#12307A", light: "#FFFFFF" } });

const horaLocal = () => Number(new Date().toLocaleString("en-US", { timeZone: FUSO, hour: "numeric", hour12: false })) % 24;

/**
 * O roteiro do dia fica pronto e guardado: é gerado uma vez de madrugada e
 * de novo às 7h (quando a rotina dos aniversários grava quem faz anos hoje),
 * e na hora em que alguém muda algo no admin (etiqueta "tv"). A TV pede o
 * roteiro a cada volta, mas recebe o guardado, sem ir ao banco. As contagens
 * ("faltam 16 dias") e o relógio são feitos na própria TV.
 */
export function roteiroDoDia(): Promise<RoteiroTv> {
  const hoje = hojeLocal();
  const turno = horaLocal() >= 7 ? "dia" : "madrugada";
  return unstable_cache(() => montarRoteiro(hoje), ["tv-roteiro", hoje, turno], { tags: [ETIQUETA_TV], revalidate: 60 * 60 * 24 })();
}

export const ETIQUETA_TV = "tv";

/** Monta as cenas do dia. */
async function montarRoteiro(hoje: string): Promise<RoteiroTv> {
  const { itens, blocos } = await lerItensEBlocos();
  const valem = itens.filter((i) => valeHoje(i, hoje));
  const de = (t: TipoItem) => valem.filter((i) => i.tipo === t);
  const [nivers, evento, qrFolder, qrPesquisa] = await Promise.all([
    aniversariantes(hoje).catch(() => []),
    proximoEvento(hoje).catch(() => null),
    qr("https://eventos.escolaamadeus.com/folder"),
    qr("https://pesquisa.escolaamadeus.com/escolar"),
  ]);

  const mmdd = hoje.slice(5);
  const comemoracao = itens.find((i) => i.tipo === "comemoracao" && i.ativo && i.data?.slice(5) === mmdd) ?? null;
  const gira = (lista: ItemTv[]) => (lista.length ? lista[diaDoAno(hoje) % lista.length] : null);

  // agenda: segunda a sexta desta semana
  const semana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const segunda = somaDias(hoje, semana === 0 ? 1 : semana === 6 ? 2 : 1 - semana);
  const diasSemana = [0, 1, 2, 3, 4].map((n) => somaDias(segunda, n));
  const agenda = itens.filter((i) => i.tipo === "agenda" && i.ativo && i.data && diasSemana.includes(i.data));

  const cenas: Cena[] = [];
  for (const b of blocos) {
    if (!b.ativo) continue;
    const c = (dados: Record<string, unknown>, chave = b.id) => cenas.push({ id: b.id, chave, segundos: b.segundos, dados });
    switch (b.id) {
      case "saudacao":
        c({ comemoracao: comemoracao ? { titulo: comemoracao.titulo, icone: comemoracao.icone } : null });
        break;
      case "aniversariantes":
        if (nivers.length) c({ lista: nivers.slice(0, 6) });
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
        if (hoje <= PRAZO_PROMO) c({ prazo: PRAZO_PROMO, qr: qrFolder });
        break;
      case "agenda":
        if (agenda.length) c({ dias: diasSemana.map((d) => ({ data: d, itens: agenda.filter((i) => i.data === d).map((i) => i.titulo) })) });
        break;
      case "sabia": {
        const s = gira(de("curiosidade"));
        if (s) c({ texto: s.titulo });
        break;
      }
      case "frase": {
        const f = gira(de("frase"));
        if (f) c({ texto: f.titulo });
        break;
      }
      case "qr":
        c({ folder: qrFolder, pesquisa: qrPesquisa });
        break;
      default:
        c({});
    }
  }
  return { hoje, cenas, atualizado: new Date().toISOString() };
}
