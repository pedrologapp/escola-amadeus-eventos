-- =============================================================
-- Migration 0022 — Vídeo conjunto ou separado por irmão
-- =============================================================
-- Nem toda família gravou igual: em algumas os irmãos aparecem juntos
-- num vídeo só, em outras cada criança gravou o seu. Não dá pra deduzir
-- isso do arquivo, então a escola escolhe por card.
--
--   false (padrão) → um vídeo por criança, cada um com seu nome
--   true           → um vídeo só, valendo pelos irmãos todos
--
-- A FOTO continua sendo sempre uma por criança: mesmo quando o vídeo é
-- junto, enquadrar dois irmãos numa foto só corta os dois.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.videos_pais
  add column if not exists video_conjunto boolean not null default false;

comment on column public.videos_pais.video_conjunto is
  'true = os irmãos aparecem num vídeo só (o do aluno principal); false = cada criança tem o seu. Só faz diferença quando o card tem irmãos.';
