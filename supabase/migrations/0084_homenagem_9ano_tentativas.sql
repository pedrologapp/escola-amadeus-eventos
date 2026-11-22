-- Homenagem do 9º ano: registro das tentativas de entrada na página dos pais (/homenagem9ano), para a escola
-- saber se alguma família está travando (nome que não aparece, data de nascimento que não confere).
-- Só o servidor lê e escreve (service role); nenhuma leitura pública.

create table if not exists public.homenagem_9ano_tentativas (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  resultado text not null check (resultado in ('entrou', 'data_errada', 'nome_nao_achado', 'erro')),
  aluno_id integer,          -- aluno escolhido na lista (vazio em nome_nao_achado)
  aluno_nome text,
  termo text,                -- o que foi digitado na busca (só em nome_nao_achado)
  data_digitada text,        -- a data que a família digitou (só em data_errada), para ajudar a orientar
  aparelho text              -- navegador/celular (resumo do user-agent)
);

create index if not exists homenagem_9ano_tentativas_criado on public.homenagem_9ano_tentativas (criado_em desc);

alter table public.homenagem_9ano_tentativas enable row level security;
