-- Placa de formatura 2026 (Grupo V A e B): a direção completa os dados e escolhe as fotos num link secreto
-- (/formatura-2026/<chave>). Só o servidor lê e escreve (service role); nenhuma leitura pública.

create table if not exists public.formatura_placa (
  id text primary key,                       -- 'g5-2026'
  dados jsonb not null default '{}'::jsonb,  -- oradora, juramentista, professora_a/b, demais_a/b, foto_turma_a/b (caminho no storage)
  atualizado_em timestamptz not null default now()
);

create table if not exists public.formatura_placa_aluno (
  nome text primary key,                     -- nome completo do Activesoft
  turma text not null,                       -- 'Grupo V · A' | 'Grupo V · B'
  fotos_beca jsonb not null default '[]'::jsonb,     -- [caminho no storage, ...] (1ª = sugerida)
  fotos_familia jsonb not null default '[]'::jsonb,
  escolha_beca int not null default 0,
  escolha_familia int not null default 0,
  aprovada boolean not null default false,
  observacao text,
  atualizado_em timestamptz not null default now()
);

alter table public.formatura_placa enable row level security;
alter table public.formatura_placa_aluno enable row level security;

insert into storage.buckets (id, name, public)
values ('formatura-placas', 'formatura-placas', false)
on conflict (id) do nothing;

insert into public.formatura_placa (id) values ('g5-2026') on conflict (id) do nothing;
