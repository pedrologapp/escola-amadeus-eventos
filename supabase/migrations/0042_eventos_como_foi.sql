-- (29/09/2026) "Como foi" no Portal da Família: evento que já passou só aparece
-- no portal se tiver fotos/vídeos (imagens_galeria) E a equipe marcar para
-- mostrar. O portal ainda limita aos 2 mais recentes dos últimos 45 dias.
alter table public.eventos add column if not exists mostrar_como_foi boolean not null default false;
