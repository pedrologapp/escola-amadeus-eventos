-- Monitoramento do WhatsApp da escola (SÓ LEITURA: nada é respondido por
-- aqui). O n8n lê a última mensagem de cada conversa a cada 5 minutos e o
-- site classifica com IA. Guarda só assunto/importância/resumo, nunca o
-- texto da mensagem (LGPD). Só o service role acessa (RLS sem políticas).

create table if not exists public.whatsapp_conversas (
  chat_id text primary key,              -- 5584999999999@c.us
  contato text,
  telefone text,
  ultima_msg_id text,
  ultima_msg_em timestamptz,
  ultima_da_escola boolean not null default false,
  aguardando_desde timestamptz,          -- 1ª mensagem do contato ainda sem resposta
  msgs_sem_resposta integer not null default 0,
  assunto text,
  importancia text check (importancia in ('alta', 'media', 'baixa')),
  precisa_acao boolean not null default false,
  acao text,
  resumo text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'respondida', 'resolvida', 'ignorada')),
  resolvido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index if not exists whatsapp_conversas_status on public.whatsapp_conversas (status, importancia, aguardando_desde);

-- Uma linha por mensagem vista (resumo, não o texto), para os assuntos da semana.
create table if not exists public.whatsapp_eventos (
  msg_id text primary key,
  chat_id text not null,
  da_escola boolean not null,
  em timestamptz not null,
  assunto text,
  importancia text,
  resumo text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_eventos_em on public.whatsapp_eventos (em desc);

alter table public.whatsapp_conversas enable row level security;
alter table public.whatsapp_eventos enable row level security;
