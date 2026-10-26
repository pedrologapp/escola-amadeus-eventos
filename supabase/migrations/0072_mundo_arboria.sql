-- Mundo de Arboria: contas dos alunos, salvamento, aulas e a central (26/10/2026, para a aula do 4º ano em 27/10).
-- O jogo (eventos.escolaamadeus.com/mundo) fala com /api/mundo/* e a central (admin.escolaamadeus.com/mundo) com /painel/mundo-api/*,
-- sempre pelo servidor (service role). Todas as tabelas têm RLS ligado e NENHUMA regra: o navegador (anon) não lê nem grava nada aqui.
-- O multiplayer vai pelo Supabase Realtime (canais de broadcast, sem tabela).

create table if not exists public.mundo_alunos (
  id text primary key,                 -- 'as' + id_aluno do Activesoft ('teste' para o aluno de teste)
  nome text not null,
  turma_id text not null,              -- '4A', '4B', 'teste'
  turma_nome text not null,
  nascimento date,                     -- a senha de entrada (com o nome)
  casa smallint,                       -- 0 a 7 (ordem das torres do jogo); null = aspirante
  qr text unique,                      -- o código do cartão com QR
  pontos_semana integer not null default 0
);
create table if not exists public.mundo_perfil (
  aluno_id text primary key references public.mundo_alunos(id) on delete cascade,
  aparencia jsonb,
  apelido text,
  apelido_status text not null default 'nenhum' check (apelido_status in ('nenhum', 'pendente', 'aprovado', 'recusado')),
  trajes jsonb not null default '[]'::jsonb,
  termo jsonb,                         -- o combinado aceito: { versao, em }
  atualizado_em timestamptz not null default now()
);
create table if not exists public.mundo_progresso (
  aluno_id text primary key references public.mundo_alunos(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,   -- as chaves do jogo (passaporte, lugares, passos, inteligências, onde estava)
  atualizado_em timestamptz not null default now()
);
create table if not exists public.mundo_sessoes (
  token text primary key,
  aluno_id text not null references public.mundo_alunos(id) on delete cascade,
  ate timestamptz not null
);
create table if not exists public.mundo_tentativas (aluno_id text not null, em timestamptz not null default now());
create index if not exists mundo_tentativas_aluno_em on public.mundo_tentativas (aluno_id, em);
create table if not exists public.mundo_estado (id smallint primary key default 1 check (id = 1), ligado boolean not null default false, desde timestamptz not null default now());
insert into public.mundo_estado (id, ligado) values (1, false) on conflict (id) do nothing;
create table if not exists public.mundo_aulas (
  codigo text primary key check (codigo ~ '^[0-9]{4}$'),
  turma_id text not null unique,
  destino text not null,
  ate timestamptz not null
);
create table if not exists public.mundo_pedidos (id text primary key, aluno_id text not null references public.mundo_alunos(id) on delete cascade, codigo text not null, em timestamptz not null default now());
create table if not exists public.mundo_online (aluno_id text primary key references public.mundo_alunos(id) on delete cascade, sala text not null, visto_em timestamptz not null default now());
create table if not exists public.mundo_chat (
  id bigint generated always as identity primary key, em timestamptz not null default now(),
  aluno_id text, nome text, turma text, sala text, texto text, ok boolean, motivo text
);
create index if not exists mundo_chat_em on public.mundo_chat (em desc);

alter table public.mundo_alunos enable row level security;
alter table public.mundo_perfil enable row level security;
alter table public.mundo_progresso enable row level security;
alter table public.mundo_sessoes enable row level security;
alter table public.mundo_tentativas enable row level security;
alter table public.mundo_estado enable row level security;
alter table public.mundo_aulas enable row level security;
alter table public.mundo_pedidos enable row level security;
alter table public.mundo_online enable row level security;
alter table public.mundo_chat enable row level security;
