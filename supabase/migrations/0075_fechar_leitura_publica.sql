-- =============================================================
-- Migration 0075 — Fecha a leitura pública de alunos e ingressos (03/11/2026)
-- =============================================================
-- Até aqui qualquer pessoa com a chave anônima (que vai no navegador) lia a tabela
-- `alunos` inteira e a `tickets` com o código do QR da portaria (0001 e 0004).
-- O formulário público de inscrição passou a buscar alunos no servidor
-- (app/(public)/eventos/[slug]/alunos-actions.ts) e a portaria já usa a service role.
--
-- APLICAR SÓ DEPOIS DO DEPLOY do código que busca no servidor: antes disso,
-- a busca de aluno da inscrição no ar para de funcionar.

-- Alunos: só quem está logado (admin, painel). A service role ignora RLS.
drop policy if exists alunos_select_public on public.alunos;
drop policy if exists "Permitir leitura pública de alunos" on public.alunos;
drop policy if exists alunos_select_authenticated on public.alunos;
create policy alunos_select_authenticated on public.alunos
  for select using (auth.role() = 'authenticated');

-- Ingressos: a leitura fica com a política tickets_all_authenticated (0004).
drop policy if exists tickets_select_public on public.tickets;

-- Alunos também aceitavam INSERT de qualquer pessoa sem login (política criada fora deste repositório).
-- Quem cadastra aluno é a sincronização do Activesoft (activeesoft/sincronizar-supabase.mjs), com a service role.
drop policy if exists "Permitir inserção de alunos" on public.alunos;
