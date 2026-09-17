/**
 * Reunião de Abertura das Matrículas — configuração da campanha.
 *
 * Tudo que a escola muda de um ano pro outro (data, textos, novidades)
 * mora aqui. A página `/matriculas2027` e o painel do admin leem daqui,
 * então dá pra ajustar o conteúdo sem tocar em componente nenhum.
 *
 * Pra rodar a campanha de novo em 2028: duplique o objeto, troque o
 * `slug` e aponte `CAMPANHA_ATUAL` pro novo. As inscrições ficam
 * separadas por slug no banco.
 */

export interface CampanhaMatriculas {
  slug: string;
  /** Rótulo pequeno no topo da página. */
  eyebrow: string;
  /** Título grande do herói. */
  titulo: string;
  subtitulo: string;
  nomeEvento: string;
  /** Data do evento em ISO (YYYY-MM-DD), horário de Brasília. */
  data: string;
  /** Hora de início, formato HH:MM. */
  hora: string;
  /** Como a hora aparece na tela ("14h"). */
  horaLabel: string;
  local: string;
  /** Endereço/complemento do local, opcional. */
  localDetalhe?: string;
  /** Depois deste instante o formulário fecha. ISO com fuso. */
  prazoInscricao: string;
  /** Limite de adultos por família. */
  maxPessoas: number;
  /** Avisos curtos listados perto do formulário. */
  infos: string[];
  /** WhatsApp da secretaria pra dúvidas (só dígitos, com DDI). */
  whatsappEscola: string;
}

export const MATRICULAS_2027: CampanhaMatriculas = {
  slug: "matriculas-2027",
  eyebrow: "Matrículas 2027",
  titulo: "O que vem agora?",
  subtitulo: "Descubra o que está por vir no Amadeus em 2027.",
  nomeEvento: "Reunião de Abertura das Matrículas",
  data: "2026-09-26",
  hora: "14:00",
  horaLabel: "14h",
  local: "Centro Educacional Amadeus",
  localDetalhe: "São Gonçalo do Amarante · RN",
  // Fecha o formulário na manhã do evento.
  prazoInscricao: "2026-09-26T12:00:00-03:00",
  maxPessoas: 2,

  infos: [
    "A reunião é para as famílias — cada família pode confirmar até 2 pessoas.",
    "Não é preciso levar documento: sua confirmação já fica registrada aqui.",
    "Chegue com 15 minutos de antecedência para acomodação.",
  ],

  whatsappEscola: "5584999999999", // TODO Pedro: confirmar o número da secretaria
};

export const CAMPANHA_ATUAL = MATRICULAS_2027;

/** Formata a data como "26/09" pro card do herói. */
export function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** "sábado" — usado como rótulo do card da data. */
export function diaDaSemana(iso: string): string {
  const d = new Date(`${iso}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** "26 de setembro de 2026" — usado nos textos corridos. */
export function dataPorExtenso(iso: string): string {
  const d = new Date(`${iso}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** As inscrições ainda estão abertas? */
export function inscricoesAbertas(
  campanha: CampanhaMatriculas = CAMPANHA_ATUAL,
  agora: Date = new Date(),
): boolean {
  return agora.getTime() <= new Date(campanha.prazoInscricao).getTime();
}
