-- =============================================================
-- Migration 0013 — Irmãos e pagamento familiar
-- =============================================================
-- 1. alunos.familia_id: identifica quem é irmão de quem.
--    Mesmo valor = mesma família (ex.: CPF do responsável ou um
--    código tipo "FAM-SILVA"). Preenchido pela escola direto no
--    Supabase (Table Editor) ou por importação.
--
-- 2. eventos.pagamento_familiar: quando ligado, a inscrição de um
--    filho vale para todos os irmãos (ex.: São João).
--
-- 3. inscricoes.alunos_incluidos: todos os alunos cobertos pela
--    inscrição (aluno principal + irmãos), preenchido no servidor
--    na hora da inscrição. Null = só o aluno_id (eventos normais).
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.alunos
  add column if not exists familia_id text;

comment on column public.alunos.familia_id is
  'Identificador da família: alunos com o mesmo valor são irmãos. Null = sem vínculo cadastrado.';

create index if not exists alunos_familia_idx
  on public.alunos(familia_id)
  where familia_id is not null;

alter table public.eventos
  add column if not exists pagamento_familiar boolean not null default false;

comment on column public.eventos.pagamento_familiar is
  'Quando true, a inscrição de um filho vale para todos os irmãos (familia_id em alunos).';

alter table public.inscricoes
  add column if not exists alunos_incluidos uuid[];

comment on column public.inscricoes.alunos_incluidos is
  'Alunos cobertos pela inscrição (principal + irmãos) em eventos com pagamento familiar. Null = apenas aluno_id.';
