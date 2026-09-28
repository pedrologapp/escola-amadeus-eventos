-- Duas contas Asaas (28/09/2026): a antiga foi bloqueada e a escola passou a usar
-- uma conta nova desde 08/09. Só a nova é conferida; o histórico da antiga fica
-- guardado com conta = 'antiga'.
alter table public.asaas_recebimentos
  add column if not exists conta text not null default 'antiga';
