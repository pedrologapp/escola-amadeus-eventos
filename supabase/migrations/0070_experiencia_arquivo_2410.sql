-- Experiência Amadeus · 4ª edição (sáb 07/11/2026). Pedido do Pedro em 24/10: os contatos das edições
-- passadas (10/10, 17/10 e 24/10) ficam guardados em experiencia_contatos_2410 (visíveis no admin, em
-- "Contatos das edições passadas") e a lista principal recomeça limpa para 07/11.
create table if not exists public.experiencia_contatos_2410 as select * from public.experiencia_contatos;
alter table public.experiencia_contatos_2410 enable row level security;
delete from public.experiencia_contatos where telefone in (select telefone from public.experiencia_contatos_2410);
