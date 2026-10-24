-- Calendário da escola (painel novo, Pedro 24/10/2026): o que acontece em cada dia — feriados, eventos,
-- gravações, demandas da Comunicação, pedagógico e prazos — com o responsável e quem cadastrou.
create table if not exists public.calendario_itens (
  id          uuid primary key default gen_random_uuid(),
  data        date not null,
  ate         date,                       -- último dia, quando dura mais de um dia
  hora        text,                       -- "14h", "7h20"…
  titulo      text not null,
  tipo        text not null default 'evento' check (tipo in ('feriado', 'evento', 'gravacao', 'comunicacao', 'pedagogico', 'prazo')),
  responsavel text,
  observacao  text,
  criado_por  text,
  created_at  timestamptz not null default now()
);
create index if not exists calendario_itens_data on public.calendario_itens (data);
alter table public.calendario_itens enable row level security;

-- Feriados nacionais até o começo de 2027 e as datas que já estão marcadas.
insert into public.calendario_itens (data, titulo, tipo, observacao, criado_por) values
  ('2026-10-28', 'Último dia da condição da rematrícula', 'prazo', 'depois vale a tabela cheia', 'sistema'),
  ('2026-11-02', 'Finados', 'feriado', 'sem aula', 'sistema'),
  ('2026-11-07', 'Experiência Amadeus', 'evento', 'na escola, gratuito', 'sistema'),
  ('2026-11-15', 'Proclamação da República', 'feriado', null, 'sistema'),
  ('2026-11-20', 'Dia da Consciência Negra', 'feriado', 'sem aula', 'sistema'),
  ('2026-12-25', 'Natal', 'feriado', null, 'sistema'),
  ('2027-01-01', 'Confraternização Universal', 'feriado', null, 'sistema');
update public.calendario_itens set hora = '14h' where titulo = 'Experiência Amadeus' and data = '2026-11-07';

-- A Experiência de 07/11: quem veio (o funil do painel).
alter table public.experiencia_contatos add column if not exists veio_0711 boolean;
