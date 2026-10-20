-- Arboria · Fase Linguística, semana 3: "Qual é o quadro?" (aula com um tablet por aluno).
-- A TV (professor) abre uma sala; cada tablet entra com o código. Cada aluno descreve um quadro secreto;
-- a descrição vai para um colega, que escolhe o quadro entre 4 (rodada 1) ou 8 parecidos (rodada 2).
-- Na rodada 2, se o colega errar, o autor reescreve (até 3 versões) e a nova versão vai para outro colega.
create table if not exists arboria_quadro_salas (
  codigo text primary key,                 -- 4 dígitos, mostrado na TV
  chave_prof text not null,                -- só a TV que abriu a sala manda nela
  turma text not null,                     -- 6º, 7º, 8º ou 9º (decide os quadros da rodada 2)
  fase text not null default 'entrada' check (fase in ('entrada', 'r1', 'r2', 'final')),
  destaque uuid,                           -- descrição mostrada na TV no final
  revelado boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists arboria_quadro_alunos (
  id uuid primary key default gen_random_uuid(),
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  nome text not null,
  mostrar_nome boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists arboria_quadro_alunos_sala on arboria_quadro_alunos (sala);

create table if not exists arboria_quadro_descricoes (
  id uuid primary key default gen_random_uuid(),
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  aluno uuid not null references arboria_quadro_alunos(id) on delete cascade,
  rodada int not null check (rodada in (1, 2)),
  versao int not null check (versao between 1 and 3),
  quadro text not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  unique (aluno, rodada, versao)
);
create index if not exists arboria_quadro_descricoes_sala on arboria_quadro_descricoes (sala);

-- Cada versão de descrição vai para um colega só (unique em descricao).
create table if not exists arboria_quadro_palpites (
  id uuid primary key default gen_random_uuid(),
  sala text not null references arboria_quadro_salas(codigo) on delete cascade,
  descricao uuid not null unique references arboria_quadro_descricoes(id) on delete cascade,
  aluno uuid not null references arboria_quadro_alunos(id) on delete cascade,
  opcoes text[] not null,
  escolha text,
  acertou boolean,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);
create index if not exists arboria_quadro_palpites_sala on arboria_quadro_palpites (sala);

alter table arboria_quadro_salas enable row level security;
alter table arboria_quadro_alunos enable row level security;
alter table arboria_quadro_descricoes enable row level security;
alter table arboria_quadro_palpites enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.
