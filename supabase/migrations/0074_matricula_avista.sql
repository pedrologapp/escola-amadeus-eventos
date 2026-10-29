-- Matrícula à vista (29/10/2026, pedido do Pedro): quando a família paga o ano inteiro direto no Pix da escola (ou no cartão da maquininha),
-- o pagamento não passa pelo Isaac nem pelo Asaas. Fica registrado em cobrancas_avulsas como uma linha já PAGA, com tipo
-- 'matricula_avista' e o detalhe do que foi pago (série de 2027, mensalidade cheia, ano, desconto à vista, livro, forma de pagamento) em
-- detalhes. Daí sai o comprovante (imagem) e o total que entrou. As cobranças normais ficam com tipo 'avulsa'.
alter table public.cobrancas_avulsas
  add column if not exists tipo text not null default 'avulsa' check (tipo in ('avulsa', 'matricula_avista')),
  add column if not exists detalhes jsonb,
  add column if not exists comprovante_enviado_em timestamptz;

create index if not exists cobrancas_avulsas_tipo_idx on public.cobrancas_avulsas (tipo);
