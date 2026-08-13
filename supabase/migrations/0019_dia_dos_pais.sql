-- =============================================================
-- Migration 0019 — Vídeos do Dia dos Pais
-- =============================================================
-- Cada aluno grava um vídeo para o pai. O card impresso (1/4 de
-- folha ofício) traz um QR que aponta para /p/<codigo>, e essa
-- página mostra o vídeo.
--
-- Por que o QR aponta pro nosso domínio e não pro arquivo:
--   o papel é permanente (o pai leva pra casa e guarda). Se um dia
--   o vídeo mudar de lugar, basta trocar `video_path` aqui e todos
--   os cards já impressos continuam funcionando.
--
-- Privacidade: são crianças. Os arquivos ficam num bucket PRIVADO
-- ('dia-dos-pais'); a página gera uma signed URL de curta duração a
-- cada visita. Nada fica exposto publicamente na internet.
--
-- Acesso à tabela: só service role (server actions/components).
-- RLS ligada sem policy, igual fardamento_interesse (0015).
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

create table if not exists public.videos_pais (
  id           uuid primary key default uuid_generate_v4(),

  -- Código curto que vai na URL do QR (ex.: 'k7m2xq').
  -- Curto de propósito: menos dado no QR = QR mais simples =
  -- leitura confiável mesmo impresso pequeno e em papel comum.
  codigo       text not null unique,

  aluno_id     uuid references public.alunos(id) on delete set null,

  -- Snapshot do nome/série/turma no momento da geração. O card
  -- impresso é um registro histórico: se o aluno sair da escola ou
  -- mudar de turma, a página dele continua correta.
  aluno_nome   text not null,
  serie        text,
  turma        text,

  -- Caminhos DENTRO do bucket privado (não são URLs).
  -- videos/<codigo>.mp4 e fotos/<codigo>.jpg
  video_path   text,
  foto_path    text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.videos_pais is
  'Um vídeo do Dia dos Pais por aluno. O card impresso leva um QR para /p/<codigo>.';

comment on column public.videos_pais.codigo is
  'Código curto da URL pública (/p/<codigo>). Alfabeto sem caracteres ambíguos (0/O, 1/I/L).';

comment on column public.videos_pais.video_path is
  'Caminho no bucket privado dia-dos-pais. Null = vídeo ainda não subiu.';

comment on column public.videos_pais.foto_path is
  'Caminho da foto do aluno no bucket privado. Null = card sai só com o nome.';

-- Um aluno só tem um vídeo nesta edição. Evita card duplicado se o
-- script de importação rodar duas vezes.
create unique index if not exists videos_pais_aluno_idx
  on public.videos_pais(aluno_id)
  where aluno_id is not null;

-- A listagem do admin e a folha de impressão ordenam por série/turma
-- pra sair na ordem de entrega das turmas.
create index if not exists videos_pais_turma_idx
  on public.videos_pais(serie, turma, aluno_nome);

alter table public.videos_pais enable row level security;
-- Sem policies de propósito: só a service role acessa.
