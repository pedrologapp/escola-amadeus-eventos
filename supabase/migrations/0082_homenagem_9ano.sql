-- Homenagem do 9º ano (formatura 2026): os pais entram com o nome do filho e a data de nascimento
-- (/homenagem9ano) e enviam dois vídeos: a mensagem livre (parte 1) e a leitura do poema em comum (parte 2),
-- mais fotos do filho se quiserem. A escola confere no admin (Campanhas → Homenagem do 9º ano).
-- Só o servidor lê e escreve (service role); nenhuma leitura pública.

create table if not exists public.homenagem_9ano_envios (
  id uuid primary key default gen_random_uuid(),
  aluno_id integer not null,                 -- id_aluno do Activesoft
  aluno_nome text not null,
  quem text not null,                        -- 'Mãe', 'Pai', 'Mãe e pai', 'Avó (Maria)'...
  parte1 text,                               -- caminho no storage
  parte2 text,
  fotos jsonb not null default '[]'::jsonb,  -- [caminho no storage, ...]
  status1 text not null default 'pendente' check (status1 in ('pendente', 'aprovado', 'refazer')),
  status2 text not null default 'pendente' check (status2 in ('pendente', 'aprovado', 'refazer')),
  observacao1 text,                          -- o que a escola pediu para refazer (aparece para a família)
  observacao2 text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists homenagem_9ano_envios_aluno on public.homenagem_9ano_envios (aluno_id);

alter table public.homenagem_9ano_envios enable row level security;

-- 300 MB por arquivo (teto do projeto no plano Pro): vídeo da galeria do celular pode ser grande.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homenagem-9ano', 'homenagem-9ano', false, 314572800, array['video/*', 'image/*'])
on conflict (id) do nothing;
