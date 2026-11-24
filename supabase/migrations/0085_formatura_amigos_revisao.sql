-- Revisão dos amigos mágicos pelas professoras (formatura do Grupo V, 24/11/2026). Na aba "Revisar amigos" do kit
-- (/amigomagico/revisar, atrás do login das professoras), cada criança tem o nome do amigo num campo que a professora
-- pode corrigir e o botão "Está certo". O nome revisado passa a valer no Diário; na ilha 3D (outro projeto) a troca é
-- aplicada à mão a partir da lista do admin. Só o servidor lê e escreve (service role); nenhuma leitura pública.

create table if not exists public.formatura_amigos_revisao (
  aluno_id uuid primary key references public.alunos(id) on delete cascade,
  nome_amigo text,                 -- o nome que a professora confirmou (null = manteve o original)
  observacao text,                 -- o que mais precisa mudar (ex.: "é um gato, não cachorro")
  conferido boolean not null default false,
  conferido_por text,              -- o nome que a professora digitou (o login do kit é um só, compartilhado)
  conferido_em timestamptz,
  aplicado_na_ilha boolean not null default false, -- o admin marca depois de trocar na ilha 3D
  atualizado_em timestamptz not null default now()
);

alter table public.formatura_amigos_revisao enable row level security;
