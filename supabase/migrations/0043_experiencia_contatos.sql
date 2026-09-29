-- Experiência Amadeus (sáb 10/10/2026, 14h): quem recebe o encarte pelo WhatsApp da escola entra
-- numa lista de contatos (para o lembrete da véspera e para a escola não perder o contato depois).
-- Só o service role lê/escreve (RLS sem políticas).

create table if not exists public.experiencia_contatos (
  telefone text primary key,            -- só dígitos, sem o 55 (DDD + número)
  responsavel text,
  crianca text,
  serie text,
  origem text not null default 'avulso' check (origem in ('novato', 'simulador', 'avulso', 'manual')),
  lembrar boolean not null default true, -- entra no lembrete automático da véspera
  convite_em timestamptz,                -- último encarte enviado com sucesso
  lembrete_em timestamptz,               -- lembrete da véspera enviado com sucesso
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.experiencia_envios (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  tipo text not null check (tipo in ('convite', 'lembrete')),
  encarte text,
  status text not null check (status in ('enviado', 'sem_whatsapp', 'erro')),
  detalhe text,
  enviado_por text,
  created_at timestamptz not null default now()
);
create index if not exists experiencia_envios_tel on public.experiencia_envios (telefone, created_at desc);

-- Uma linha só: liga/desliga o lembrete automático da véspera.
create table if not exists public.experiencia_config (
  id int primary key default 1 check (id = 1),
  lembrete_automatico boolean not null default true
);
insert into public.experiencia_config (id) values (1) on conflict (id) do nothing;

alter table public.experiencia_contatos enable row level security;
alter table public.experiencia_envios enable row level security;
alter table public.experiencia_config enable row level security;
