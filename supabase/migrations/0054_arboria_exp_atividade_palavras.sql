-- Atividade dos pais, versão das 15 palavras: rodada 1 (lembrar) → escolher uma das 8 formas → rodada 2 (lembrar com a forma).
-- atividade_fase: null (fechada) | 'r1' | 'forma' | 'r2'. Ninguém vê o resultado de ninguém: a TV mostra só as formas escolhidas.
alter table arboria_exp_reuniao add column if not exists atividade_fase text;
alter table arboria_exp_atividade alter column respostas drop not null;
alter table arboria_exp_atividade add column if not exists r1 int;
alter table arboria_exp_atividade add column if not exists forma text;
alter table arboria_exp_atividade add column if not exists r2 int;
