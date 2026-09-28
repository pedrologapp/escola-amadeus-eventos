-- (28/09/2026) Alertas de reembolso/contestação vindos do Asaas e registro da
-- limpeza automática de cobranças de inscrição não pagas após 3 dias.
create table if not exists public.asaas_alertas (
  id text primary key,                -- id do pagamento no Asaas
  conta text not null,
  status text not null,               -- REFUND_REQUESTED, REFUNDED, CHARGEBACK_REQUESTED...
  valor numeric(12,2),
  descricao text,
  referencia text,
  data date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  visto_em timestamptz,
  visto_por text
);
alter table public.asaas_alertas enable row level security;

create table if not exists public.asaas_exclusoes (
  id text primary key,                -- id do pagamento no Asaas
  conta text not null,
  referencia text,
  valor numeric(12,2),
  status_antes text,
  criado_no_asaas date,
  simulado boolean not null default true,
  em timestamptz not null default now(),
  erro text
);
alter table public.asaas_exclusoes enable row level security;
