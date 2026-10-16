-- Resposta automática do WhatsApp oficial (YCloud): o pai pergunta o valor da
-- rematrícula, o sistema pede o nome do filho e, se bater com o cadastro
-- daquele número, manda a carta de 2027. Cada passo fica aqui: serve de
-- "memória" da conversa (estamos esperando o nome?) e de histórico.
-- msg_id evita responder duas vezes quando a YCloud reenvia o mesmo evento.
-- Só o service role lê/escreve (RLS sem políticas).
create table if not exists public.whatsapp_auto (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,          -- DDD + número, só dígitos (sem 55)
  msg_id text unique,              -- id da mensagem recebida na YCloud
  evento text not null check (evento in ('pediu_nome', 'nome_errado', 'enviou_carta', 'secretaria', 'ignorado')),
  aluno_id integer,
  aluno_nome text,
  detalhe text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_auto_telefone on public.whatsapp_auto (telefone, created_at desc);
alter table public.whatsapp_auto enable row level security;
