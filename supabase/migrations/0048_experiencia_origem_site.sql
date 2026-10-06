-- Experiência Amadeus (06/10/2026): página pública de inscrição (/experiencia), divulgada no post das redes.
-- Quem se inscreve entra na mesma lista, com origem 'site' e presença confirmada (vai_em).
alter table public.experiencia_contatos drop constraint if exists experiencia_contatos_origem_check;
alter table public.experiencia_contatos add constraint experiencia_contatos_origem_check
  check (origem in ('novato', 'simulador', 'avulso', 'manual', 'whatsapp', 'site'));
