-- Resposta MANUAL pelo painel do WhatsApp (a direção escreve e clica em
-- enviar; nada é automático). O texto da última mensagem recebida fica
-- guardado só enquanto a conversa está aguardando, para quem for responder
-- saber o que foi dito; é apagado quando a conversa é respondida/resolvida.
alter table public.whatsapp_conversas add column if not exists ultimo_texto text;

create table if not exists public.whatsapp_respostas (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  texto text,
  arquivo_nome text,
  status text not null check (status in ('enviado', 'erro')),
  detalhe text,
  enviado_por text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_respostas_chat on public.whatsapp_respostas (chat_id, created_at desc);
alter table public.whatsapp_respostas enable row level security;
