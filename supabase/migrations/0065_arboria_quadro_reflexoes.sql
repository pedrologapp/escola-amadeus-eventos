-- "Qual é o quadro?" · o fechamento da Fase Linguística (Pedro, 21/10/2026): no fim das rodadas, cada aluno
-- escreve o que descobriu que sabe fazer com as palavras e o que quer descobrir no ano que vem. Fica registrado.
create table if not exists arboria_quadro_reflexoes (
  aluno uuid primary key references arboria_quadro_alunos(id) on delete cascade,
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  descobri text not null,
  quero text not null,
  criado_em timestamptz not null default now()
);
alter table arboria_quadro_reflexoes enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.

-- 21/10: ficou só a primeira pergunta (Pedro); "quero" deixa de ser obrigatória.
alter table arboria_quadro_reflexoes alter column quero drop not null;
