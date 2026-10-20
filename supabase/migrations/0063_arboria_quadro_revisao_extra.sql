-- "Qual é o quadro?" (Pedro, 20/10/2026, depois da 1ª aula):
-- 1) mais de um aluno pode adivinhar a mesma descrição: o 1º palpite é o oficial (vale para o autor:
--    reescrita, estatística); os outros são "extra" (só para quem estava esperando não ficar parado);
-- 2) as observações do Arboria enquanto o aluno escreve: só manda quando a última foi resolvida.

alter table arboria_quadro_palpites drop constraint if exists arboria_quadro_palpites_descricao_key;
alter table arboria_quadro_palpites add column if not exists extra boolean not null default false;
create unique index if not exists arboria_quadro_palpites_oficial on arboria_quadro_palpites (descricao) where not extra;
create unique index if not exists arboria_quadro_palpites_um_por_aluno on arboria_quadro_palpites (descricao, aluno);

create table if not exists arboria_quadro_revisoes (
  id uuid primary key default gen_random_uuid(),
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  aluno uuid not null references arboria_quadro_alunos(id) on delete cascade,
  rodada int not null,
  versao int not null,
  texto text not null,
  aprovado boolean not null,
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists arboria_quadro_revisoes_aluno on arboria_quadro_revisoes (aluno, rodada, versao);
alter table arboria_quadro_revisoes enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.
