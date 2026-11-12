-- (12/11/2026) TV: as frases da faixa de notícias do rodapé (ex.: "Matrículas 2027 abertas") são itens de tv_itens
-- com tipo 'rodape'. Só aumenta a lista de tipos aceitos; nada muda nos itens que já existem.
alter table public.tv_itens drop constraint if exists tv_itens_tipo_check;
alter table public.tv_itens add constraint tv_itens_tipo_check
  check (tipo in ('aviso', 'recado', 'agenda', 'frase', 'curiosidade', 'comemoracao', 'rodape'));

insert into public.tv_itens (tipo, titulo)
select 'rodape', 'Matrículas 2027 abertas'
where not exists (select 1 from public.tv_itens where tipo = 'rodape');
