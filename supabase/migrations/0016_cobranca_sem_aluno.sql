-- =============================================================
-- Migration 0016 — Cobrança avulsa sem aluno cadastrado
-- =============================================================
-- Permite cobrar alguém que não está na tabela `alunos`
-- (ex.: aluno novo ainda não importado). `aluno_id` já era
-- opcional; esta coluna guarda o nome digitado à mão.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.cobrancas_avulsas
  add column if not exists aluno_nome text;

comment on column public.cobrancas_avulsas.aluno_nome is
  'Nome do aluno digitado manualmente quando ele não está cadastrado (aluno_id null).';
