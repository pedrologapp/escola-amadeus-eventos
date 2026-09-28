-- Conferência com o Asaas (direção, 28/09/2026): o admin passa a mostrar o que
-- de fato entrou no Asaas. SÓ LEITURA do Asaas — nada aqui cria, altera ou
-- cancela cobrança lá, e não mexe no status_pagamento (quem marca "pago" e
-- manda a confirmação no WhatsApp continua sendo o fluxo do n8n).

-- Situação da cobrança no Asaas + quanto já entrou (parceladas).
alter table public.cobrancas_avulsas
  add column if not exists asaas_status text,            -- PENDING, OVERDUE, RECEIVED, CONFIRMED, REMOVIDA...
  add column if not exists asaas_recebido numeric(12,2), -- soma das parcelas já recebidas
  add column if not exists asaas_parcelas_pagas int,
  add column if not exists asaas_parcelas_total int,
  add column if not exists asaas_conferido_em timestamptz;

alter table public.inscricoes
  add column if not exists asaas_status text,
  add column if not exists asaas_conferido_em timestamptz;

-- Tudo que entrou no Asaas, inclusive o que foi criado fora do sistema
-- (livros parcelados do fluxo antigo "EduHub - Amadeus - Financeiro").
create table if not exists public.asaas_recebimentos (
  id text primary key,                 -- id do pagamento no Asaas (pay_...)
  valor numeric(12,2) not null,
  valor_liquido numeric(12,2),
  recebido_em date,                    -- data do pagamento (ou confirmação no cartão)
  forma text,                          -- PIX, CREDIT_CARD, BOLETO...
  status text,
  descricao text,
  referencia text,                     -- externalReference
  origem text not null,                -- evento | avulsa | externo
  categoria text not null,             -- Eventos, Cobrança avulsa, Livros, Outros...
  parcela int,
  atualizado_em timestamptz not null default now()
);
create index if not exists asaas_recebimentos_recebido_em on public.asaas_recebimentos (recebido_em desc);
create index if not exists asaas_recebimentos_referencia on public.asaas_recebimentos (referencia);

alter table public.asaas_recebimentos enable row level security;
-- Sem políticas: só o servidor (service role) lê e escreve.

-- Quando foi a última conferência (para rodar sozinha 1x por dia).
create table if not exists public.asaas_conferencias (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  recebimentos int,
  pendentes_conferidas int,
  erro text
);
alter table public.asaas_conferencias enable row level security;
