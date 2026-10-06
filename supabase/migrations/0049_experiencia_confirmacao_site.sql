-- Experiência Amadeus (06/10/2026): quem se inscreve pelo site recebe na hora uma confirmação no WhatsApp
-- (texto + convite + link do folder sem valores). Registrada em experiencia_envios com tipo 'confirmacao'.
alter table public.experiencia_envios drop constraint if exists experiencia_envios_tipo_check;
alter table public.experiencia_envios add constraint experiencia_envios_tipo_check
  check (tipo in ('convite', 'lembrete', 'confirmacao'));
