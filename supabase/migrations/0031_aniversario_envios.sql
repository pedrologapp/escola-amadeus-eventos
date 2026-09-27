-- Registro dos cartões de aniversário enviados pelo fluxo do n8n
-- ("Aniversários · Alunos e Colaboradores"). Serve para o fluxo nunca mandar
-- o mesmo cartão duas vezes no mesmo dia, mesmo se for executado de novo.
--
-- Uma linha por (dia, pessoa, telefone). pessoa_ref é o id do Activesoft com
-- prefixo: "aluno:2166" ou "colab:13". Envios de teste usam "teste:*".

create table if not exists public.aniversario_envios (
  id          uuid primary key default gen_random_uuid(),
  data        date not null,
  tipo        text not null check (tipo in ('aluno', 'colaborador')),
  pessoa_ref  text not null,
  nome        text not null,
  telefone    text not null,
  status      text not null default 'enviado' check (status in ('enviado', 'sem_whatsapp', 'erro')),
  detalhe     text,
  created_at  timestamptz not null default now()
);

create unique index if not exists aniversario_envios_unico
  on public.aniversario_envios (data, pessoa_ref, telefone);

-- Só o service role (n8n) lê e escreve.
alter table public.aniversario_envios enable row level security;
