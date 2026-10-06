/**
 * Dia do Professor 2026 (06/10): bate e volta ao West Aquapark para toda a equipe.
 * Página pública /diadoprofessor; respostas em dia_professor_respostas; painel em /admin/dia-do-professor.
 */
export const URL_DIA_PROFESSOR = "https://eventos.escolaamadeus.com/diadoprofessor";
// As respostas fecham na sexta, 09/10/2026, às 7h (horário de Natal, UTC-3).
export const PRAZO_DIA_PROFESSOR = new Date("2026-10-09T07:00:00-03:00");
export const DATAS = [
  { valor: "16/10", titulo: "16 de outubro", dia: "sexta-feira" },
  { valor: "29/10", titulo: "29 de outubro", dia: "quinta-feira, feriado" },
] as const;
export const VALOR_COLABORADOR = 100; // R$ 250 do passeio, a escola paga R$ 150
export const VALOR_ACOMPANHANTE = 250;
export const encerrado = () => Date.now() > PRAZO_DIA_PROFESSOR.getTime();
