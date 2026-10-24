-- Avisos internos de aniversário (24/10/2026): professora do aluno (Infantil/F1) e coordenações
-- (colaborador). Uma linha por (dia, número): rodar de novo no mesmo dia não repete o aviso.
create table if not exists public.aniversario_avisos (
  id          uuid primary key default gen_random_uuid(),
  data        date not null,
  para        text not null,
  telefone    text not null,
  texto       text not null,
  status      text not null check (status in ('enviado', 'sem_whatsapp', 'erro')),
  detalhe     text,
  created_at  timestamptz not null default now(),
  unique (data, telefone)
);

alter table public.aniversario_avisos enable row level security;
