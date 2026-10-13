-- Experiência Amadeus: observação livre por família e fim dos números repetidos (o mesmo celular com e sem o 9).
-- A cópia da 1ª edição (experiencia_contatos_1010) continua intacta.
alter table experiencia_contatos add column if not exists observacao text;

create temp table pares as
  select c10.telefone as t10, c11.telefone as t11
  from experiencia_contatos c10
  join experiencia_contatos c11 on length(c10.telefone) = 10 and c11.telefone = substr(c10.telefone, 1, 2) || '9' || substr(c10.telefone, 3);

-- a linha com o 9 fica, completada com o que só a outra tinha
update experiencia_contatos c set
  responsavel = case when c.responsavel is null or c.responsavel ~* 'escola|amadeus' then coalesce(nullif(d.responsavel, ''), c.responsavel) else c.responsavel end,
  crianca = coalesce(c.crianca, d.crianca),
  serie = coalesce(c.serie, d.serie),
  veio_1010 = coalesce(c.veio_1010, d.veio_1010),
  matriculou_em = coalesce(c.matriculou_em, d.matriculou_em),
  observacao = coalesce(c.observacao, d.observacao),
  criado_em = least(c.criado_em, d.criado_em)
from pares p join experiencia_contatos d on d.telefone = p.t10
where c.telefone = p.t11;
delete from experiencia_contatos where telefone in (select t10 from pares);

-- celular que só existe no formato antigo (sem o 9) passa para o formato com o 9
update experiencia_contatos set telefone = substr(telefone, 1, 2) || '9' || substr(telefone, 3)
where length(telefone) = 10 and substr(telefone, 3, 1) in ('6', '7', '8', '9');
