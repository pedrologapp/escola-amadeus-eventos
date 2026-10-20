-- "Qual é o quadro?": rodada 3 (8 retratos da mesma pessoa, só a expressão muda), aluno escolhido da lista
-- da turma (nada de nome inventado) e a dica da IA quando o colega erra.
alter table arboria_quadro_salas drop constraint if exists arboria_quadro_salas_fase_check;
alter table arboria_quadro_salas add constraint arboria_quadro_salas_fase_check check (fase in ('entrada', 'r1', 'r2', 'r3', 'final'));

alter table arboria_quadro_descricoes drop constraint if exists arboria_quadro_descricoes_rodada_check;
alter table arboria_quadro_descricoes add constraint arboria_quadro_descricoes_rodada_check check (rodada in (1, 2, 3));

alter table arboria_quadro_alunos add column if not exists escola_aluno uuid;   -- alunos.id (a lista da turma)
create unique index if not exists arboria_quadro_alunos_sala_escola on arboria_quadro_alunos (sala, escola_aluno);

alter table arboria_quadro_palpites add column if not exists dica text;          -- pergunta da IA para quem vai reescrever
