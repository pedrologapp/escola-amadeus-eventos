/** As situações de um aluno numa rodada (usadas no servidor e na tela do relatório). */
export type Situacao = "primeira" | "melhorou" | "nao" | "sem_resposta" | "reescrever" | "travou" | "nao_escreveu";

export const SITUACAO: Record<Situacao, { rotulo: string; finalizou: boolean; cor: string }> = {
  primeira: { rotulo: "Colega acertou de 1ª", finalizou: true, cor: "bg-emerald-100 text-emerald-800" },
  melhorou: { rotulo: "Colega acertou na reescrita", finalizou: true, cor: "bg-teal-100 text-teal-800" },
  nao: { rotulo: "Colega não acertou", finalizou: false, cor: "bg-rose-100 text-rose-800" },
  reescrever: { rotulo: "Não reescreveu a tempo", finalizou: false, cor: "bg-orange-100 text-orange-800" },
  sem_resposta: { rotulo: "Ninguém chegou a ler", finalizou: false, cor: "bg-slate-100 text-slate-700" },
  travou: { rotulo: "Travou no Arboria", finalizou: false, cor: "bg-amber-100 text-amber-800" },
  nao_escreveu: { rotulo: "Não escreveu", finalizou: false, cor: "bg-slate-100 text-slate-500" },
};

export const SITUACAO_CLIENTE = SITUACAO;
