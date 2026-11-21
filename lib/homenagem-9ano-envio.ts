import "server-only";

import { nomeBonito } from "@/lib/fotos-infancia";

/**
 * Convite da homenagem surpresa do 9º ano (quinta 26/11, 10h): a lista dos responsáveis com celular,
 * lida do Activesoft na hora, para o Pedro mandar pelo WhatsApp dele (botão que abre a conversa com o
 * texto pronto). Nada é enviado pelo sistema. Os números só aparecem dentro do admin.
 */

export const TEXTO_CONVITE_9ANO = `*Pais e responsáveis do 9º ano*

Vamos fazer uma *homenagem surpresa* para mostrar aos nossos alunos o quanto eles são amados. Sua presença é indispensável.

*1. Entre no site e grave a sua homenagem*
Estamos preparando um vídeo surpresa para a formatura. Entre neste site para gravar a sua mensagem para o seu filho ou sua filha (até 2 minutos) e enviar fotos de quando ele ou ela era pequeno:
https://eventos.escolaamadeus.com/homenagem9ano
A gravação e o envio são feitos no próprio site, não precisa mandar pelo WhatsApp.

*2. Venha à escola na quinta, 26/11, às 10h*
Traga uma homenagem: fotos de quando era criança (numa cartolina ou num porta-retrato), um cartaz com mensagens de carinho, uma flor, um balão ou uma cartinha.

*Um pedido de coração*
Sabemos que a rotina é corrida, mas faça o possível para vir. Ver os colegas abraçados pela família e ficar sem ninguém seria muito triste para eles. Se não puder, mande alguém querido no seu lugar (avó, avô, tio, padrinho).

*É SURPRESA: não conte nada ao seu filho ou à sua filha, para não estragar a emoção.*

Contamos com o carinho e a cumplicidade de todos.
*Equipe da Escola Amadeus*`;

export interface ContatoNono {
  nome: string;
  /** 11 dígitos com DDD, pronto para o wa.me; null quando o número do cadastro está com erro */
  celular: string | null;
  /** o cadastro tinha 8 dígitos e o sistema pôs o 9 na frente: conferir */
  semNove: boolean;
}

export interface AlunoContatos {
  nome: string;
  turma: string;
  contatos: ContatoNono[];
}

type Linha = Record<string, unknown>;

async function pedir(caminho: string): Promise<Linha[]> {
  const token = process.env.ACTIVESOFT_TOKEN;
  if (!token) throw new Error("ACTIVESOFT_TOKEN não configurada");
  for (let i = 0; i < 3; i++) {
    const r = await fetch("https://siga01.activesoft.com.br/api/" + caminho, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (r.ok) {
      const j = (await r.json()) as unknown;
      return (Array.isArray(j) ? j : ((j as { results?: unknown[] }).results ?? [])) as Linha[];
    }
    if (r.status < 500) throw new Error(`Activesoft respondeu ${r.status}`);
  }
  throw new Error("Activesoft fora do ar");
}

function limparCelular(t: unknown): { celular: string | null; semNove: boolean } | null {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length < 10) return null; // sem número
  if (d.length === 10 && /^[6-9]$/.test(d[2])) return { celular: d.slice(0, 2) + "9" + d.slice(2), semNove: true };
  if (d.length !== 11) return { celular: null, semNove: false };
  return { celular: d, semNove: false };
}

export async function listarContatosNono(): Promise<AlunoContatos[]> {
  const [acesso, cadastro, responsaveis] = await Promise.all([
    pedir("v0/acesso/alunos/"),
    pedir("v1/lista_alunos/"),
    pedir("v1/lista_responsaveis/"),
  ]);
  const nonos = new Map<number, { nome: string; turma: string }>();
  for (const a of acesso) {
    if (!/^9/.test(String(a.nome_serie ?? ""))) continue;
    const id = Number(a.id_aluno);
    if (id && !nonos.has(id)) nonos.set(id, { nome: nomeBonito(String(a.nome ?? "")), turma: String(a.nome_turma ?? "") });
  }
  const porId = new Map(responsaveis.map((r) => [Number(r.id), r]));
  const cadPorId = new Map(cadastro.map((c) => [Number(c.id), c]));
  const out: AlunoContatos[] = [];
  for (const [id, a] of nonos) {
    const c = cadPorId.get(id);
    const contatos: ContatoNono[] = [];
    if (c) {
      const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...((c.responsaveis_adicionais_ids as unknown[]) ?? [])]
        .map(Number)
        .filter(Boolean);
      for (const rid of new Set(ids)) {
        const r = porId.get(rid);
        const cel = limparCelular(r?.celular);
        if (!cel) continue;
        if (cel.celular && contatos.some((x) => x.celular === cel.celular)) continue;
        contatos.push({ nome: nomeBonito(String(r?.nome ?? "")), ...cel });
      }
    }
    out.push({ ...a, contatos });
  }
  return out.sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}
