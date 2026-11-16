-- (16/11/2026) TV: as telas com foto que a equipe coloca (Pedro: "o que precisa de fotos deixa para quando tiver fotos,
-- igual aos comunicados e agenda"): fotos da semana (tipo 'foto'), conquistas ('conquista') e a nossa equipe ('pessoa').
-- O endereço da foto fica em tv_itens.imagem (as fotos vão para o balde público "eventos", pasta tv/).
-- As telas automáticas novas (tempo, contagem, desafio, palavra, inteligência) não precisam de banco: se a linha delas
-- não existe em tv_blocos, a TV usa o lugar e o tempo padrão (lib/tv.ts, NOVOS), e a linha nasce quando a escola mexe.

alter table public.tv_itens add column if not exists imagem text;

alter table public.tv_itens drop constraint if exists tv_itens_tipo_check;
alter table public.tv_itens add constraint tv_itens_tipo_check
  check (tipo in ('aviso', 'recado', 'agenda', 'frase', 'curiosidade', 'comemoracao', 'rodape', 'foto', 'conquista', 'pessoa'));
