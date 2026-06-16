-- =============================================================
-- Migration 0015 — Interesse em Fardamento (colaboradores)
-- =============================================================
-- Uma linha por registro. Não é anônimo: guardamos o nome.
-- `quer = false` → tamanho/modelo/tipo ficam nulos.
-- Acesso só via service role (server actions); RLS ligado sem policy.
-- =============================================================

create table if not exists public.fardamento_interesse (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  quer        boolean not null,
  modelo      text,        -- 'masculino' | 'feminino'
  tamanho     text,        -- 'P' | 'M' | 'G' | 'GG'
  tipo        text,        -- 'normal' | 'babylook'
  quantidade  int not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists fardamento_quer_idx on public.fardamento_interesse(quer);

alter table public.fardamento_interesse enable row level security;
-- Sem policies de propósito: só a service role (server actions) acessa.
