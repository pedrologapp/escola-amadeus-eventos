-- Experiência Amadeus (09/10/2026): na véspera, a escola pediu pelo WhatsApp que cada família contasse se vem e
-- quantas pessoas. O monitor lê a resposta e guarda aqui; o admin soma o total para o lanche.
alter table public.experiencia_contatos
  add column if not exists pessoas integer,
  add column if not exists nao_vai_em timestamptz,
  add column if not exists resposta_texto text,
  add column if not exists resposta_em timestamptz,
  add column if not exists conferir boolean not null default false,
  add column if not exists pedido_confirmacao_em timestamptz;

alter table public.experiencia_envios drop constraint if exists experiencia_envios_tipo_check;
alter table public.experiencia_envios add constraint experiencia_envios_tipo_check
  check (tipo in ('convite', 'lembrete', 'confirmacao', 'pedido_confirmacao'));
