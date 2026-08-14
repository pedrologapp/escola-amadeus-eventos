-- =============================================================
-- Migration 0021 — Irmãos com foto e vídeo próprios
-- =============================================================
-- Antes, `irmaos` guardava só nomes (text[]) e o card tinha uma foto
-- e um vídeo para todo mundo. Na prática não funciona: enquadrar dois
-- irmãos numa foto só corta os dois, e cada criança gravou o seu
-- próprio recado.
--
-- Agora cada irmão é um participante completo:
--   [{ "nome": "...", "aluno_id": "uuid|null",
--      "foto_path": "fotos/<codigo>-2.jpg",
--      "video_path": "videos/<codigo>-2.mp4" }]
--
-- O aluno principal continua nas colunas aluno_nome/foto_path/
-- video_path; os irmãos ficam aqui. Um card = uma família = um QR.
--
-- `aluno_id` importa: é o que permite descobrir que o irmão também é
-- pagante e já tem card próprio — nesse caso o card conjunto absorve o
-- dele, senão o pai recebe dois cards.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.videos_pais
  add column if not exists irmaos_dados jsonb not null default '[]'::jsonb;

comment on column public.videos_pais.irmaos_dados is
  'Irmãos que dividem o card: [{nome, aluno_id, foto_path, video_path}]. Cada um com sua foto e seu vídeo. Vazio = card de um aluno só.';

-- Traz os nomes que já estavam em `irmaos` (sem foto/vídeo ainda).
update public.videos_pais
set irmaos_dados = (
  select jsonb_agg(
    jsonb_build_object('nome', n, 'aluno_id', null,
                       'foto_path', null, 'video_path', null)
  )
  from unnest(irmaos) as n
)
where coalesce(array_length(irmaos, 1), 0) > 0
  and irmaos_dados = '[]'::jsonb;

-- `irmaos` (text[]) fica por enquanto: dropar antes do deploy do código
-- novo derrubaria a versão em produção que ainda lê essa coluna.
comment on column public.videos_pais.irmaos is
  'LEGADO — substituída por irmaos_dados. Mantida só até o deploy assentar; pode ser removida depois.';
