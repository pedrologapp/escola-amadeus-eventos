-- =============================================================
-- Migration 0014 — Enquete de Clima Escolar
-- =============================================================
-- Uma linha por resposta. Anônima: guardamos só série/turma (sem nome).
-- `respostas` é o conjunto de respostas (jsonb), `meta` traz os sinais de
-- qualidade (duração, straight-line, coerência, suspeito).
--
-- Acesso: a escrita (formulário público) e a leitura (painel admin) passam
-- sempre por server actions usando a service role. Por isso o RLS fica
-- LIGADO e SEM policies — ninguém acessa com a chave anônima.
-- =============================================================

create table if not exists public.enquete_respostas (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null default 'clima-2026', -- permite rodar de novo a cada bimestre
  serie       text,
  turma       text,
  respostas   jsonb not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists enquete_slug_idx  on public.enquete_respostas(slug);
create index if not exists enquete_serie_idx on public.enquete_respostas(serie);

alter table public.enquete_respostas enable row level security;
-- Sem policies de propósito: só a service role (server actions) acessa.
