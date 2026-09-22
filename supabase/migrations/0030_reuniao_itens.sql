-- =============================================================
-- Migration 0030 — Preparação da Reunião de Rematrículas
-- =============================================================
-- Painel de organização do evento: o cronograma do dia e os
-- materiais que precisam ficar prontos, cada um com seu status.
--
-- `slug` permite reaproveitar o painel em outros eventos sem
-- tabela nova, igual fizemos na enquete e nas matrículas.
--
-- `categoria` separa as duas visões da tela:
--   cronograma → o que acontece no dia, em ordem de horário
--   material   → o que precisa ser produzido antes
--
-- `status` é o que a coordenação muda conforme avança:
--   falta / fazendo / pronto / nao_temos
-- "nao_temos" é diferente de "falta": marca o que a escola
-- decidiu que não vai existir, pra não ficar cobrando pra sempre.
--
-- Acesso: só pelo painel admin, via server actions com a service
-- role. RLS LIGADO e SEM policies de propósito.
--
-- Idempotente: pode rodar várias vezes sem quebrar.
-- =============================================================

create table if not exists public.reuniao_itens (
  id           uuid primary key default uuid_generate_v4(),
  slug         text not null default 'rematriculas-2027',
  categoria    text not null check (categoria in ('cronograma','material')),
  titulo       text not null,
  detalhe      text,
  responsavel  text,
  horario      text,
  -- Onde o material ficou salvo: link do Drive, do site, ou o caminho
  -- do arquivo no repositório. É por aqui que a equipe acha a peça.
  link         text,
  status       text not null default 'falta'
               check (status in ('falta','fazendo','pronto','nao_temos')),
  ordem        int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Para bancos onde a tabela já existia antes deste campo.
alter table public.reuniao_itens add column if not exists link text;

create index if not exists reuniao_itens_slug_idx
  on public.reuniao_itens(slug, categoria, ordem);

drop trigger if exists reuniao_itens_set_updated_at on public.reuniao_itens;
create trigger reuniao_itens_set_updated_at
  before update on public.reuniao_itens
  for each row execute function public.tg_set_updated_at();

alter table public.reuniao_itens enable row level security;
-- Sem policies de propósito: só a service role (server actions) acessa.

-- ---------- Carga inicial ----------
-- Só entra se a tabela estiver vazia, pra rodar a migration de novo
-- não duplicar nem sobrescrever o que a coordenação já editou.

insert into public.reuniao_itens (categoria, titulo, detalhe, responsavel, horario, status, ordem)
select * from (values
  ('cronograma','Trailer de iniciação da reunião','Boas-vindas aos pais, de forma alegre e divertida. A entonação carrega a frase que dá nome ao encontro.',null,'14h','falta',10),
  ('cronograma','Apresentação do Geekie','O novo material didático apresentado às famílias.',null,'14h30','falta',20),
  ('cronograma','Lanche',null,null,'15h30','falta',30),
  ('cronograma','Abertura de "O que nós somos!"','Introduz os conceitos e exibe os vídeos do Fundamental 1 e do Fundamental 2.','Pedro','16h','falta',40),
  ('cronograma','Geekie no Fundamental 1 e 2','Tablet, exercícios e o que o professor passa a enxergar. Precisa responder celular, livro e tablet.','Adriana','16h','falta',50),
  ('cronograma','Introdução ao Infantil','Com o vídeo do segmento.','Pedro','16h','falta',60),
  ('cronograma','Geekie na Educação Infantil','A mesma proposta, voltada para o Infantil.','Gislene','16h','falta',70),
  ('cronograma','Arbória: o que vem à frente',null,'Pedro','16h','falta',80),
  ('cronograma','Humanização e valores','Acalma os pais depois de tanta informação e dá valor ao que foi apresentado.','Graça','16h','falta',90),
  ('cronograma','Fechamento financeiro','Vídeo "a escola é o único caminho" e as mensalidades do próximo ano.','Sonia','16h','falta',100),

  ('material','Slide da Adriana','Geekie no Fundamental 1 e 2, tablet e exercícios.','Adriana',null,'falta',10),
  ('material','Slide da Gislene','Geekie na Educação Infantil.','Gislene',null,'falta',20),
  ('material','Slide da Graça — abertura',null,'Graça',null,'falta',30),
  ('material','Slide da Graça — humanização','Entra depois do Geekie, antes dos valores.','Graça',null,'falta',40),
  ('material','Slide da Sônia — monetização','Depende dos valores das mensalidades de 2027.','Sonia',null,'falta',50),
  ('material','Slide do Arbória e introdução dos segmentos',null,'Pedro',null,'falta',60),
  ('material','Site do Geekie','Conteúdo aprovado. Falta publicar em eventos.escolaamadeus.com/geekie.',null,null,'fazendo',70),
  ('material','Encarte com QR do site do Geekie','Só vai para a gráfica depois que o site estiver no ar.',null,null,'falta',80),
  ('material','Site "O que nós somos" com os vídeos','Depende de quais vídeos estarão prontos até sábado.',null,null,'falta',90),
  ('material','Encarte com QR de "O que nós somos"','Depende do site acima.',null,null,'falta',100),
  ('material','Folder com novidades e mensalidades','Aguardando o modelo e os valores.',null,null,'falta',110),
  ('material','Ata da reunião em PDF','Ata_Reuniao_22set2026.pdf',null,null,'pronto',120),
  ('material','Pesquisa completa sobre o Geekie','Geekie_Pesquisa.md',null,null,'pronto',130),
  ('material','Página de confirmação de presença','eventos.escolaamadeus.com/matriculas2027',null,null,'pronto',140),
  ('material','QR da reunião para o cartaz','docs/qr-matriculas2027.png',null,null,'pronto',150)
) as v(categoria,titulo,detalhe,responsavel,horario,status,ordem)
where not exists (select 1 from public.reuniao_itens);
