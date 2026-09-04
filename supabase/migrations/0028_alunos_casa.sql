-- =============================================================
-- Migration 0028 — Casa do aluno (Arboria, Fundamental 2)
-- =============================================================
-- O Fundamental 2 está dividido em 8 Casas (as inteligências múltiplas):
-- Corporal-Cinestésica, Espacial, Interpessoal, Intrapessoal, Linguística,
-- Lógico-Matemática, Musical e Naturalista.
--
-- A casa importa no evento "CAMISETAS DO FUNDAMENTAL 2": a camiseta
-- temática é da cor da casa do aluno, então o relatório do evento precisa
-- somar e separar por casa para fechar o pedido com a confecção.
--
-- Fica em `alunos` (e não numa tabela de inscrição) porque é atributo do
-- aluno, não da compra — o mesmo aluno leva a casa para qualquer evento.
--
-- Nullable de propósito: só o Fundamental 2 tem casa. Os outros 343 alunos
-- da base ficam com null, e isso é o estado correto, não um pendura.
--
-- Fonte: docs/Arboria_As_Casas_29ago2026.pdf (162 alunos), importado por
-- scripts/importar-casas.mjs.
-- =============================================================

alter table public.alunos
  add column if not exists casa text;

create index if not exists alunos_casa_idx
  on public.alunos (casa)
  where casa is not null;

comment on column public.alunos.casa is
  'Casa do Fundamental 2 (Arboria): Corporal-Cinestésica, Espacial, Interpessoal, Intrapessoal, Linguística, Lógico-Matemática, Musical, Naturalista. Null para quem não é do Fund. 2.';
