-- =============================================================
-- Migration 0017 — Horário de término do evento
-- =============================================================
-- Opcional: quando preenchido, as telas mostram "início – fim".
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.eventos
  add column if not exists hora_fim time;

comment on column public.eventos.hora_fim is
  'Horário de término do evento (opcional). Exibido como "hora_evento – hora_fim".';
