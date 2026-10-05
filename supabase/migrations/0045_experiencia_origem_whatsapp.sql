-- Experiência Amadeus (05/10/2026): a equipe também encaminha o vídeo do convite pelo celular da escola.
-- O monitor do WhatsApp (só leitura) vê esses envios e coloca o número na lista com origem 'whatsapp'.
alter table public.experiencia_contatos drop constraint if exists experiencia_contatos_origem_check;
alter table public.experiencia_contatos add constraint experiencia_contatos_origem_check
  check (origem in ('novato', 'simulador', 'avulso', 'manual', 'whatsapp'));
