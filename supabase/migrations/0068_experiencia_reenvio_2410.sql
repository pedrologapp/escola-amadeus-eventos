-- Experiência Amadeus · reenvio do convite para o sábado 24/10 pela API oficial (YCloud), com os botões "Eu vou" / "Não vou".
-- enviar_2410: o Pedro valida no admin quem recebe (true = recebe, false = não recebe, null = ainda não decidido).
-- A resposta do botão e o número de pessoas (perguntado depois do "Eu vou") ficam aqui, separados das edições anteriores.
alter table public.experiencia_contatos add column if not exists enviar_2410 boolean;
alter table public.experiencia_contatos add column if not exists convite_2410_em timestamptz;
alter table public.experiencia_contatos add column if not exists convite_2410_status text;      -- enviado | erro (com o detalhe)
alter table public.experiencia_contatos add column if not exists resposta_2410 text check (resposta_2410 in ('vai', 'nao_vai'));
alter table public.experiencia_contatos add column if not exists resposta_2410_em timestamptz;
alter table public.experiencia_contatos add column if not exists pessoas_2410 integer;

-- a resposta automática ganha os passos da Experiência
alter table public.whatsapp_auto drop constraint if exists whatsapp_auto_evento_check;
alter table public.whatsapp_auto add constraint whatsapp_auto_evento_check
  check (evento in ('pediu_nome', 'nome_errado', 'enviou_carta', 'secretaria', 'quer_renovar', 'ignorado', 'exp_vai', 'exp_nao_vai', 'exp_pessoas'));
