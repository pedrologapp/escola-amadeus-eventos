-- Diário da formatura do Grupo V (18/12/2026, "Meu Mundo da Imaginação"): as professoras registram ao vivo, por aluno,
-- numa conversa (/amigomagico/diario): texto, foto e áudio. A escola acompanha e baixa tudo no admin
-- (Campanhas → Diário da formatura do Grupo V). A página é aberta (sem senha, decisão do Pedro), mas só o servidor
-- lê e escreve (service role); nenhuma leitura pública. Fotos e áudios ficam num bucket PRIVADO.

create table if not exists public.formatura_diario_mensagens (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  turma text not null check (turma in ('A', 'B')),
  tipo text not null check (tipo in ('texto', 'foto', 'audio')),
  texto text,                                -- o que a professora escreveu (tipo texto)
  arquivo text,                              -- caminho no storage (tipo foto ou audio)
  duracao numeric,                           -- segundos do áudio, quando o navegador informa
  criado_em timestamptz not null default now(),
  check ((tipo = 'texto' and texto is not null) or (tipo <> 'texto' and arquivo is not null))
);

create index if not exists formatura_diario_mensagens_aluno on public.formatura_diario_mensagens (aluno_id, criado_em);

alter table public.formatura_diario_mensagens enable row level security;

-- 25 MB por arquivo: foto vai reduzida pelo navegador (~0,5 MB) e áudio de alguns minutos cabe com folga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formatura-diario', 'formatura-diario', false, 26214400, array['image/*', 'audio/*', 'video/webm', 'video/mp4'])
on conflict (id) do nothing;
