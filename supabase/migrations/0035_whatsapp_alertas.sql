-- Aviso no grupo "Amadeus - Direção" quando chega mensagem séria/urgente
-- (autorizado pela direção em 28/09/2026, só para esse caso). E quem
-- respondeu, para ninguém responder por cima.
alter table public.whatsapp_conversas
  add column if not exists urgente boolean not null default false,
  add column if not exists alertado_em timestamptz,
  add column if not exists respondido_por text,
  add column if not exists respondido_em timestamptz;
