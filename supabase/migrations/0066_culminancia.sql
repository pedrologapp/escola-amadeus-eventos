-- (22/10/2026) Projeto de culminância do Arboria: os painéis ("outdoors") das salas.
-- Do Maternal II ao 5º ano cada série tem uma inteligência; do 6º ao 9º são as 8 casas.
-- As professoras preenchem pela página pública /culminancia. Cada frente guarda as ideias, as imagens que ela mandou (referência)
-- e as nossas versões (proposta), que o Pedro aprova ou pede ajuste.
create table if not exists public.culminancia_frentes (
  chave text primary key,             -- "maternal-ii", "1-ano", "casa-ling"... (lista em lib/culminancia.ts)
  inteligencia text,                  -- ling | log | esp | mus | cor | nat | inter | intra (nas casas é fixa)
  professora text,                   -- quem preencheu (página pública /culminancia)
  ideia_sala text,                    -- como a sala vai ficar
  ideia_outdoor text,                 -- a ideia do(s) outdoor(s)
  outdoors jsonb not null default '[]', -- [{ descricao, largura, altura }] em cm
  enviado_em timestamptz,             -- quando a professora mandou pela página
  anotacoes text,                     -- nossas anotações no admin
  atualizado_em timestamptz not null default now()
);
alter table public.culminancia_frentes enable row level security;

create table if not exists public.culminancia_imagens (
  id uuid primary key default gen_random_uuid(),
  frente text not null,
  tipo text not null check (tipo in ('referencia', 'proposta')),
  arquivo text not null,              -- caminho no bucket culminancia
  legenda text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'ajustar')),
  comentario text,                    -- o que ajustar, quando o status é "ajustar"
  criado_em timestamptz not null default now()
);
create index if not exists culminancia_imagens_frente on public.culminancia_imagens (frente, criado_em);
alter table public.culminancia_imagens enable row level security;
-- sem políticas: só o servidor (service role) lê e grava.

-- Privado: as imagens só abrem pelo admin (link assinado).
insert into storage.buckets (id, name, public)
values ('culminancia', 'culminancia', false)
on conflict (id) do nothing;
