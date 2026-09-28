-- (28/09/2026) Fotos de infância da equipe. Cada colaborador procura o nome
-- numa página pública (/criancaamadeus) e sobe uma foto de quando era criança.
-- Uma foto por pessoa: mandar de novo troca a anterior.
create table if not exists public.fotos_infancia (
  chave text primary key,             -- "colab:<id do Activesoft>" ou "nome:<nome sem acento>"
  colaborador_id integer,             -- id no Activesoft; null quando digitou o nome
  nome text not null,
  arquivo text not null,              -- caminho no bucket fotos-infancia
  idade text,                         -- "uns 5 anos", opcional
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.fotos_infancia enable row level security;

-- Privado: as fotos só abrem pelo admin (link assinado).
insert into storage.buckets (id, name, public)
values ('fotos-infancia', 'fotos-infancia', false)
on conflict (id) do nothing;
