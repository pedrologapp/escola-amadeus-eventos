-- A Corte de Arboria (26/10/2026, para a aula do 4º ano em 27/10): o estado da sessão de cada turma (fase, temas e votos, função aberta e
-- candidatos, quem ocupa cada posto, mãos levantadas). As funções ficam salvas: na próxima aula cada um volta ao seu posto.
-- Só o servidor (service role) lê e grava; o painel do professor fala por /painel/mundo-api/corte, o jogo por /api/mundo/corte.
create table if not exists public.mundo_corte (
  turma_id text primary key,
  estado jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.mundo_corte enable row level security;
-- as ações dos alunos (Quero ser, voto no tema, levantar a mão): uma linha por toque, para 30 tablets ao mesmo tempo não se atropelarem;
-- o painel lê as da fase atual (fase = o número da fase aberta pelo professor).
create table if not exists public.mundo_corte_acoes (
  id bigint generated always as identity primary key,
  turma_id text not null, fase integer not null, aluno_id text not null, tipo text not null, valor text, em timestamptz not null default now()
);
create index if not exists mundo_corte_acoes_turma_fase on public.mundo_corte_acoes (turma_id, fase);
alter table public.mundo_corte_acoes enable row level security;
