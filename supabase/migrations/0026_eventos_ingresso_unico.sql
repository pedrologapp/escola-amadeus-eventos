-- =============================================================
-- Migration 0026 — Evento de ingresso único
-- =============================================================
-- Alguns eventos são de um ingresso por inscrição: o Desfile Cívico é
-- taxa de participação do aluno, não tem "levar mais gente". Hoje o
-- formulário público mostra os botões de + e -, e quem se inscreve
-- precisa entender que deve deixar em 1 — o que convida ao erro.
--
-- Com `ingresso_unico`, o seletor de quantidade some e a inscrição já
-- nasce com 1. Se o evento tiver mais de um tipo, vira escolha de UM
-- tipo (rádio), ainda com quantidade 1.
--
-- Default false: nenhum evento existente muda de comportamento.
-- =============================================================

alter table public.eventos
  add column if not exists ingresso_unico boolean not null default false;

comment on column public.eventos.ingresso_unico is
  'true = 1 ingresso por inscrição; o público não escolhe quantidade.';
