-- Experiência Amadeus: marcar no admin quem MATRICULOU depois do evento. Quem matriculou também não recebe mais o convite nem o lembrete.
alter table experiencia_contatos add column if not exists matriculou_em timestamptz;
