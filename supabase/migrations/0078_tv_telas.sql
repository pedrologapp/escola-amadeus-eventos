-- (12/11/2026) TV: telas criadas pela escola a partir de formatos prontos (aviso, celebração, programação…).
-- Cada tela entra no roteiro junto com os blocos de tv_blocos, pela mesma "ordem" (aqui pode ser quebrada,
-- ex.: 10.5 = entre o bloco 10 e o 11). O código antigo da TV não lê esta tabela.
create table if not exists public.tv_telas (
  id uuid primary key default gen_random_uuid(),
  formato text not null check (formato in ('aviso', 'recado', 'frase', 'sabia', 'celebracao', 'programacao', 'contagem', 'foto')),
  campos jsonb not null default '{}'::jsonb,  -- o que se escreveu em cada formato (títulos, linhas, horários…)
  ordem numeric not null,
  segundos integer not null default 12,
  inicio date,                                -- aparece a partir de (vazio = já)
  fim date,                                   -- aparece até (vazio = sempre)
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.tv_telas enable row level security;
-- sem políticas: só o service role (o servidor) lê e escreve

-- a formatura do 5º ano vira uma tela editável, no lugar onde o bloco fixo estava
insert into public.tv_telas (formato, campos, ordem, segundos, ativo)
select 'celebracao',
       '{"pre": "o voo mais bonito do ano", "titulo": "Formatura", "linha": "5º ano 2026"}'::jsonb,
       b.ordem, b.segundos, b.ativo
from public.tv_blocos b
where b.id = 'formatura'
  and not exists (select 1 from public.tv_telas t where t.formato = 'celebracao' and t.campos->>'linha' = '5º ano 2026');
