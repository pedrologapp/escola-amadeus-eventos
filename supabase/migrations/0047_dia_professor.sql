-- (06/10/2026) Dia do Professor: bate e volta ao West Aquapark. Cada colaborador
-- procura o nome numa página pública (/diadoprofessor) e responde se vai,
-- qual data prefere (16 ou 29/10) e se leva acompanhantes. Responder de novo troca a resposta.
create table if not exists public.dia_professor_respostas (
  chave text primary key,             -- "colab:<id do Activesoft>" ou "nome:<nome sem acento>"
  colaborador_id integer,             -- id no Activesoft; null quando digitou o nome
  nome text not null,
  participa boolean not null,
  data_preferida text check (data_preferida in ('16/10', '29/10')),
  acompanhantes integer not null default 0 check (acompanhantes between 0 and 10),
  acompanhantes_quem text,            -- "meu filho e minha esposa", opcional
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.dia_professor_respostas enable row level security;
-- Sem políticas: só o servidor (chave de serviço) lê e grava.
