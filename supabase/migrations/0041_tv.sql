-- (29/09/2026) TV Amadeus: a TV da recepção roda um roteiro em loop que se
-- monta sozinho a cada volta. O que é automático (aniversariantes, próximo
-- evento, prazo da rematrícula) vem das outras tabelas; aqui fica o que a
-- equipe escreve (avisos, recados, agenda, frases, curiosidades, datas
-- comemorativas) e a ordem/tempo de cada bloco.
create table if not exists public.tv_itens (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('aviso', 'recado', 'agenda', 'frase', 'curiosidade', 'comemoracao')),
  titulo text not null default '',
  texto text not null default '',
  icone text,                 -- um emoji
  data date,                  -- agenda: o dia; comemoração: o dia do ano (o ano não importa)
  inicio date,                -- aparece a partir de (vazio = já)
  fim date,                   -- aparece até (vazio = sempre)
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.tv_itens enable row level security;

create table if not exists public.tv_blocos (
  id text primary key,        -- saudacao, aniversariantes, avisos, recados, evento, promo, agenda, sabia, frase, qr, formatura, fim
  ativo boolean not null default true,
  ordem integer not null,
  segundos integer not null
);
alter table public.tv_blocos enable row level security;

insert into public.tv_blocos (id, ordem, segundos) values
  ('saudacao', 1, 9),
  ('aniversariantes', 2, 12),
  ('avisos', 3, 11),
  ('recados', 4, 12),
  ('evento', 5, 13),
  ('promo', 6, 13),
  ('agenda', 7, 13),
  ('sabia', 8, 11),
  ('frase', 9, 9),
  ('qr', 10, 11),
  ('formatura', 11, 12),
  ('fim', 12, 6)
on conflict (id) do nothing;

-- Primeiro aviso de verdade (pedido do Pedro em 29/09).
insert into public.tv_itens (tipo, titulo, texto, icone, inicio, fim) values
  ('aviso', 'Arena Arbória', 'O resultado sai na quinta-feira, 01/10! Qual Casa vai levar?', '🏆', '2026-09-29', '2026-10-01');

-- Frases que giram sozinhas (uma por dia).
insert into public.tv_itens (tipo, titulo) values
  ('frase', 'Quem *aprende* descobre até onde *pode chegar!*'),
  ('frase', 'Todo dia é dia de *aprender* algo *novo!*'),
  ('frase', 'Ler é *viajar* sem sair do *lugar.*'),
  ('frase', 'Juntos a gente vai *mais longe!*'),
  ('frase', 'Errar faz parte de *aprender.*'),
  ('frase', 'Gentileza *gera* gentileza.'),
  ('frase', 'Sonhe *grande*, comece *hoje!*'),
  ('frase', 'A curiosidade é o *começo* de *tudo.*');

-- Curiosidades para o "Você sabia?" (uma por dia).
insert into public.tv_itens (tipo, titulo) values
  ('curiosidade', 'O coração de uma criança bate *até 100 vezes por minuto*, mais rápido que o de um adulto.'),
  ('curiosidade', 'O polvo tem *três corações* e o sangue dele é azul.'),
  ('curiosidade', 'As abelhas conseguem reconhecer *rostos humanos*.'),
  ('curiosidade', 'Um bebê nasce com *cerca de 300 ossos*; o adulto tem 206, porque alguns se juntam.'),
  ('curiosidade', 'A luz do Sol leva *uns 8 minutos* para chegar até a Terra.'),
  ('curiosidade', 'O Brasil tem a *maior floresta tropical* do mundo: a Amazônia.'),
  ('curiosidade', 'Os golfinhos dormem com *metade do cérebro* de cada vez.'),
  ('curiosidade', 'A Lua se afasta da Terra *uns 4 centímetros* por ano.'),
  ('curiosidade', 'Formigas conseguem carregar *muitas vezes o próprio peso*.'),
  ('curiosidade', 'O beija-flor é o único pássaro que consegue *voar para trás*.');

-- Datas comemorativas (o ano da data não importa; aparece na saudação do dia).
insert into public.tv_itens (tipo, titulo, icone, data) values
  ('comemoracao', 'Dia Internacional da Mulher', '💐', '2026-03-08'),
  ('comemoracao', 'Dia Mundial da Água', '💧', '2026-03-22'),
  ('comemoracao', 'Dia do Livro Infantil', '📚', '2026-04-18'),
  ('comemoracao', 'Dia dos Povos Indígenas', '🪶', '2026-04-19'),
  ('comemoracao', 'Dia da Terra', '🌍', '2026-04-22'),
  ('comemoracao', 'Dia Mundial do Livro', '📖', '2026-04-23'),
  ('comemoracao', 'Dia do Trabalhador', '🛠️', '2026-05-01'),
  ('comemoracao', 'Dia Mundial do Meio Ambiente', '🌱', '2026-06-05'),
  ('comemoracao', 'Dia do Amigo', '🤝', '2026-07-20'),
  ('comemoracao', 'Dia dos Avós', '👵', '2026-07-26'),
  ('comemoracao', 'Dia do Estudante', '🎒', '2026-08-11'),
  ('comemoracao', 'Dia do Folclore', '🎭', '2026-08-22'),
  ('comemoracao', 'Dia da Independência', '🇧🇷', '2026-09-07'),
  ('comemoracao', 'Dia da Árvore', '🌳', '2026-09-21'),
  ('comemoracao', 'Dia Mundial do Coração', '❤️', '2026-09-29'),
  ('comemoracao', 'Dia das Crianças', '🎈', '2026-10-12'),
  ('comemoracao', 'Dia do Professor', '🍎', '2026-10-15'),
  ('comemoracao', 'Dia Mundial da Alimentação', '🥕', '2026-10-16'),
  ('comemoracao', 'Dia Nacional do Livro', '📕', '2026-10-29'),
  ('comemoracao', 'Dia da Bandeira', '🇧🇷', '2026-11-19'),
  ('comemoracao', 'Dia da Consciência Negra', '✊🏿', '2026-11-20'),
  ('comemoracao', 'Natal', '🎄', '2026-12-25');
