-- "Qual é o quadro?" (Pedro, 20/10): a TV não mostra quadros durante a rodada; o professor encerra a rodada
-- (r1f, r2f, r3f) e aí a TV mostra os quadros com as estatísticas de cada um. No final, a IA escolhe as
-- 3 melhores descrições de cada rodada para a celebração (guardadas em melhores, para não escolher de novo).
alter table arboria_quadro_salas drop constraint if exists arboria_quadro_salas_fase_check;
alter table arboria_quadro_salas add constraint arboria_quadro_salas_fase_check
  check (fase in ('entrada', 'r1', 'r1f', 'r2', 'r2f', 'r3', 'r3f', 'final'));
alter table arboria_quadro_salas add column if not exists melhores jsonb;
