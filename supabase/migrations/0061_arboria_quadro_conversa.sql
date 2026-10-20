-- "Qual é o quadro?": no lugar da dica única, uma conversa com o Arbória para quem vai reescrever
-- (o guia pergunta, o aluno responde; o Arbória nunca escreve pelo aluno). Lista de { de: 'arboria'|'aluno', texto }.
alter table arboria_quadro_palpites add column if not exists conversa jsonb not null default '[]'::jsonb;
