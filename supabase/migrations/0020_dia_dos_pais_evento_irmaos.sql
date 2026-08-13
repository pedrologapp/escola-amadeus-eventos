-- =============================================================
-- Migration 0020 — Dia dos Pais: origem no evento + irmãos
-- =============================================================
-- Mudança de fluxo: os cards deixam de ser gerados por série e passam
-- a sair das INSCRIÇÕES PAGAS de um evento. Quem paga é quem recebe o
-- card — não adianta imprimir pra aluno que não vai.
--
-- Irmãos: dois filhos do mesmo pai gravam UM vídeo e o pai leva UM
-- card com os dois nomes. Como `alunos.familia_id` está vazio no banco
-- inteiro, não há como descobrir isso sozinho — a escola digita o nome
-- do irmão na tela, e é isso que `irmaos` guarda.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.videos_pais
  add column if not exists evento_id uuid references public.eventos(id) on delete set null;

comment on column public.videos_pais.evento_id is
  'Evento que originou o card (ex.: Dia dos Pais 2026). Permite reaproveitar a estrutura em outras edições sem misturar as listas.';

alter table public.videos_pais
  add column if not exists irmaos text[] not null default '{}'::text[];

comment on column public.videos_pais.irmaos is
  'Nomes de irmãos que dividem o MESMO card e o MESMO vídeo. Vazio = card de um aluno só. Digitado pela escola: alunos.familia_id não está preenchido.';

-- A listagem do admin filtra por evento
create index if not exists videos_pais_evento_idx
  on public.videos_pais(evento_id);
