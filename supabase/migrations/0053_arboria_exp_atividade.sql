-- Experiência Amadeus: a atividade ao vivo dos pais (3 situações, 8 jeitos de resolver = 8 inteligências).
-- O telão abre a atividade (atividade_em); cada celular responde uma vez; a TV desenha os caminhos ao vivo.
alter table arboria_exp_reuniao add column if not exists atividade_em timestamptz;
create table if not exists arboria_exp_atividade (
  familia uuid primary key,
  respostas text[] not null,
  criado_em timestamptz not null default now()
);
alter table arboria_exp_atividade enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.
