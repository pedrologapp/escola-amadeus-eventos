-- (22/10/2026) Conferência de pagamentos dos eventos com o Asaas.
-- No passeio do Dia das Crianças, 9 pagamentos de 20/10 não chegaram ao sistema (o aviso
-- Asaas → n8n falhou) e as inscrições ficaram "pendente". A partir daqui o sistema confere
-- sozinho, a cada 30 minutos, as inscrições pendentes com cobrança no Asaas: o que o Asaas
-- diz recebido vira "pago" (sem mandar mensagem a ninguém) e fica registrado aqui.
create table if not exists public.conferencia_pagamentos (
  id uuid primary key default gen_random_uuid(),
  em timestamptz not null default now(),
  evento_id uuid,                     -- null = conferência geral (todos os eventos recentes)
  origem text not null,               -- "automatica" (a cada 30 min) | "manual" (botão no evento)
  conferidas integer not null default 0,
  corrigidas jsonb not null default '[]', -- [{ inscricaoId, aluno, evento, valor }]
  erro text
);
create index if not exists conferencia_pagamentos_em on public.conferencia_pagamentos (em desc);
alter table public.conferencia_pagamentos enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.

-- O agendamento (pg_cron + pg_net chamando /api/conferencia/pagamentos a cada 30 min)
-- foi criado direto no banco, porque leva o segredo do webhook no cabeçalho e este
-- repositório é público. Para ver: select * from cron.job where jobname = 'conferir-pagamentos';
