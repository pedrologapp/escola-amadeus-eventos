-- =============================================================
-- Migration 0012 — Busca inteligente de alunos
-- =============================================================
-- Função buscar_alunos(termo): cada palavra digitada vira um
-- filtro independente (AND), em qualquer posição do nome, e a
-- comparação ignora acentos e maiúsculas.
--
--   "Ali melo"  → acha "Alice Melo de Oliveira"
--   "jose"      → acha "José"
--
-- Os formulários chamam via supabase.rpc('buscar_alunos', { termo })
-- e ainda aplicam filtros de série/turma/limit por cima (PostgREST).
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

create extension if not exists unaccent with schema extensions;

create or replace function public.buscar_alunos(termo text)
returns setof public.alunos
language sql
stable
set search_path = public, extensions
as $$
  select a.*
  from public.alunos a
  where (
    select coalesce(
      bool_and(
        unaccent(lower(a.nome_completo)) like '%' || unaccent(lower(t)) || '%'
      ),
      false
    )
    from unnest(string_to_array(trim(termo), ' ')) as t
    where t <> ''
  )
$$;

-- O site público (anon) também busca alunos na inscrição
grant execute on function public.buscar_alunos(text) to anon, authenticated;
