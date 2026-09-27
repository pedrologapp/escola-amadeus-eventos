-- Envios da carta da rematrícula 2027 pelo WhatsApp da escola (admin →
-- n8n → WAHA). Serve para a direção ver quem já recebeu e não mandar duas
-- vezes sem querer. Só o service role lê/escreve (RLS sem políticas).
create table if not exists public.rematricula_envios (
  id uuid primary key default gen_random_uuid(),
  aluno_id integer,               -- id do Activesoft; null para novato
  aluno_nome text not null,
  serie_2027 text not null,
  responsavel text,
  telefone text not null,
  status text not null check (status in ('enviado', 'sem_whatsapp', 'erro')),
  detalhe text,
  enviado_por text,
  created_at timestamptz not null default now()
);
create index if not exists rematricula_envios_aluno on public.rematricula_envios (aluno_id, created_at desc);
alter table public.rematricula_envios enable row level security;
