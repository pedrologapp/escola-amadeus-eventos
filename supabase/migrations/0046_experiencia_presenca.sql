-- Experiência Amadeus (05/10/2026): o pai responde "EU VOU" (ou parecido) no WhatsApp da escola;
-- o monitor (só leitura) vê a resposta e marca a presença confirmada na lista.
alter table public.experiencia_contatos add column if not exists vai_em timestamptz;      -- quando confirmou presença
alter table public.experiencia_contatos add column if not exists vai_texto text;          -- o que respondeu (curto)
