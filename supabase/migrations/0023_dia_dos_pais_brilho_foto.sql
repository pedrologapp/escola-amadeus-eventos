-- =============================================================
-- Migration 0023 — Ajuste de brilho por foto
-- =============================================================
-- Parte das fotos saiu subexposta (medindo o rosto: 62 e 71 de 255,
-- contra ~120 numa foto bem exposta). No card, sobre fundo azul escuro
-- e impresso, a criança quase some.
--
-- Guardamos só o AJUSTE, não a imagem corrigida: o arquivo original
-- continua intacto no Storage e a correção é aplicada na hora de
-- exibir. Assim dá pra subir, comparar e voltar atrás sem reenviar
-- nada — o que importa na véspera da impressão.
--
-- 100 = sem ajuste. 150 = 50% mais claro.
--
-- Os irmãos guardam o próprio brilho dentro de `irmaos_dados`
-- (chave "brilho"), pela mesma razão de terem foto própria.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

alter table public.videos_pais
  add column if not exists brilho_foto smallint not null default 100
  check (brilho_foto between 100 and 250);

comment on column public.videos_pais.brilho_foto is
  'Brilho aplicado na exibição da foto do aluno principal, em porcentagem. 100 = original. Não altera o arquivo.';
