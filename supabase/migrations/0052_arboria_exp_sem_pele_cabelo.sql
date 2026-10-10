-- Experiência Amadeus: o cadastro não pergunta mais pele e cabelo (a fantasia cobre o rosto e o cabelo).
alter table arboria_exp_criancas alter column pele drop not null;
alter table arboria_exp_criancas alter column cabelo drop not null;
