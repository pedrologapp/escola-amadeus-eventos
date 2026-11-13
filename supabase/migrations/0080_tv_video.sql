-- (13/11/2026) TV: o formato "video" nas telas criadas pela escola (um vídeo pronto, sem som, na TV inteira).
alter table public.tv_telas drop constraint if exists tv_telas_formato_check;
alter table public.tv_telas add constraint tv_telas_formato_check
  check (formato in ('aviso', 'recado', 'frase', 'sabia', 'celebracao', 'programacao', 'contagem', 'foto', 'video'));
