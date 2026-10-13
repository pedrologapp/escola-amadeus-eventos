-- Experiência Amadeus · 2ª edição (sáb 17/10/2026). A 1ª (10/10) fica guardada inteira em experiencia_contatos_1010.
-- veio_1010: o Pedro marca no admin quem veio (true) ou não veio (false) no dia 10; quem veio não recebe o convite de novo.
-- As respostas, confirmações e lembretes da 1ª edição são zeradas para começar a 17/10 do zero (a cópia guarda tudo).
create table if not exists experiencia_contatos_1010 as select * from experiencia_contatos;
alter table experiencia_contatos_1010 enable row level security;
alter table experiencia_contatos add column if not exists veio_1010 boolean;
update experiencia_contatos set
  vai_em = null, vai_texto = null, pessoas = null, nao_vai_em = null, resposta_texto = null, resposta_em = null,
  conferir = false, pedido_confirmacao_em = null, lembrete_confirmado = false, lembrete_em = null, lembrar = false, convite_em = null;
