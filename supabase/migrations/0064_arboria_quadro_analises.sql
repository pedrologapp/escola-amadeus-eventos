-- "Qual é o quadro?" · relatório do professor no admin (Pedro, 20/10/2026): a análise da IA de por que
-- um aluno não conseguiu finalizar uma rodada. Fica guardada para não gerar de novo.
create table if not exists arboria_quadro_analises (
  aluno uuid not null references arboria_quadro_alunos(id) on delete cascade,
  rodada int not null,
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now(),
  primary key (aluno, rodada)
);
alter table arboria_quadro_analises enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.
