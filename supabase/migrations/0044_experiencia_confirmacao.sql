-- Lembrete da Experiência só vai para quem o Pedro confirmou na lista (29/09/2026).
-- "lembrar" = marcado na tela; "lembrete_confirmado" = estava marcado quando ele apertou "Confirmar lista".
-- Mexeu no "lembrar" depois? volta a precisar de confirmação.
alter table public.experiencia_contatos add column if not exists lembrete_confirmado boolean not null default false;
