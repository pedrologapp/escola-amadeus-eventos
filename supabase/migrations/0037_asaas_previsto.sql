-- Cartão parcelado: o Asaas CONFIRMA todas as parcelas na hora e o dinheiro
-- cai na conta mês a mês. Separa "entrou na conta" (recebido_em) de
-- "confirmado, a cair" (previsto_em = data estimada do crédito).
alter table public.asaas_recebimentos
  add column if not exists previsto_em date;
alter table public.cobrancas_avulsas
  add column if not exists asaas_confirmado numeric(12,2); -- recebido + confirmado no cartão
