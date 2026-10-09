-- Experiência Amadeus (10/10/2026) · a história do Arboria de cada criança.
-- O pai lê o QR, cadastra o(s) filho(s) e responde a atividade; no fim da reunião
-- o admin aperta "Liberar histórias" e cada celular abre a história do filho.

-- Estado da reunião (uma linha só): quando começou e quando as histórias foram liberadas.
create table if not exists arboria_exp_reuniao (
  id int primary key default 1 check (id = 1),
  iniciada_em timestamptz,
  liberada_em timestamptz,
  atualizado_em timestamptz not null default now()
);
insert into arboria_exp_reuniao (id) values (1) on conflict do nothing;

-- Uma linha por criança. "familia" junta os irmãos cadastrados no mesmo celular.
create table if not exists arboria_exp_criancas (
  id uuid primary key default gen_random_uuid(),
  familia uuid not null,
  responsavel text,
  nome text not null,
  serie text not null,
  genero text not null check (genero in ('menino', 'menina')),
  pele text not null check (pele in ('clara', 'morena', 'negra')),
  cabelo text not null check (cabelo in ('liso', 'cacheado', 'crespo')),
  respostas jsonb not null default '[]'::jsonb,
  foto_path text,          -- foto do rosto (opcional, com autorização); apagar depois do evento
  foto_autorizada boolean not null default false,
  boneco_url text,         -- boneco feito com o rosto (quando houver); senão usa o da biblioteca
  criado_em timestamptz not null default now()
);
create index if not exists arboria_exp_criancas_familia on arboria_exp_criancas (familia);

alter table arboria_exp_reuniao enable row level security;
alter table arboria_exp_criancas enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.
