-- =============================================================
-- Migration 0029 — Reunião de Abertura das Matrículas 2027
-- =============================================================
-- Confirmação de presença da reunião (evento gratuito, sem ingresso).
-- Uma linha por família inscrita.
--
-- `slug` permite repetir a campanha nos próximos anos sem tabela nova
-- (matriculas-2028, etc.), igual fizemos na enquete.
--
-- `aluno_id` / `familia_id` vêm da busca no cadastro (buscar_alunos).
-- Guardamos também o nome digitado em `aluno_nome`: se o aluno não
-- estiver no cadastro (calouro, irmão que ainda vai entrar), a inscrição
-- continua valendo — só fica sem vínculo.
--
-- `pessoas` é quantos adultos vêm (1 ou 2). A escola comunica o limite
-- de 2 por família; o check garante que ninguém force valor maior.
--
-- Acesso: escrita (formulário público) e leitura (painel admin) passam
-- sempre por server actions com a service role. Por isso o RLS fica
-- LIGADO e SEM policies — ninguém acessa com a chave anônima.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

create table if not exists public.matriculas_inscricoes (
  id                uuid primary key default uuid_generate_v4(),
  slug              text not null default 'matriculas-2027',
  responsavel_nome  text not null,
  telefone          text not null,
  aluno_id          uuid references public.alunos(id) on delete set null,
  aluno_nome        text not null,
  familia_id        text,
  serie             text,
  turma             text,
  pessoas           int  not null default 1 check (pessoas between 1 and 2),
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists matriculas_inscricoes_slug_idx
  on public.matriculas_inscricoes(slug);
create index if not exists matriculas_inscricoes_familia_idx
  on public.matriculas_inscricoes(slug, familia_id);
create index if not exists matriculas_inscricoes_criado_idx
  on public.matriculas_inscricoes(created_at desc);

-- Mesmo aluno não entra duas vezes na mesma campanha: se o pai reenviar
-- o formulário (recarregou a página, clicou de novo), a server action faz
-- upsert em cima deste índice em vez de criar duplicata.
create unique index if not exists matriculas_inscricoes_aluno_uniq
  on public.matriculas_inscricoes(slug, aluno_id)
  where aluno_id is not null;

drop trigger if exists matriculas_inscricoes_set_updated_at
  on public.matriculas_inscricoes;
create trigger matriculas_inscricoes_set_updated_at
  before update on public.matriculas_inscricoes
  for each row execute function public.tg_set_updated_at();

alter table public.matriculas_inscricoes enable row level security;
-- Sem policies de propósito: só a service role (server actions) acessa.
