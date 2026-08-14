import Link from "next/link";
import { Printer } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ordenarPorTurma,
  statusDoCard,
  type VideoPais,
} from "@/lib/dia-dos-pais";
import { assinarVarios } from "@/lib/dia-dos-pais-storage";
import { Button } from "@/components/ui/button";
import { PainelDiaDosPais, type CardComFoto, type Inscrito } from "./painel";

/**
 * Admin do Dia dos Pais.
 *
 * A lista sai das INSCRIÇÕES PAGAS do evento — quem pagou é quem recebe
 * o card. Os pendentes ficam numa lista à parte, pra incluir com um
 * clique se alguém acertar o pagamento em cima da hora.
 */
export const dynamic = "force-dynamic";

/** Só pra miniatura na listagem; não precisa durar. */
const VALIDADE_SEGUNDOS = 60 * 60;

/** O evento desta edição. Trocar aqui reaproveita a tela em outra data. */
const NOME_DO_EVENTO = "Dia dos Pais 2026";

export default async function AdminDiaDosPaisPage() {
  const admin = createAdminClient();

  const { data: eventos } = await admin
    .from("eventos")
    .select("id, nome")
    .ilike("nome", `%${NOME_DO_EVENTO}%`)
    .limit(1);
  const evento = eventos?.[0] ?? null;

  // Cards já criados. A ordem final é feita em JS: o banco só sabe
  // ordenar série como texto, e aí "1º Ano" viria antes de "Maternal".
  const { data: dados } = await admin.from("videos_pais").select("*");
  const cards = ordenarPorTurma((dados ?? []) as VideoPais[]);

  // Miniatura de cada criança: o principal e cada irmão.
  const fotos = await assinarVarios(
    cards.flatMap((c) => [
      c.foto_path,
      ...(c.irmaos_dados ?? []).map((i) => i.foto_path),
    ]),
    VALIDADE_SEGUNDOS,
  );
  const comFoto: CardComFoto[] = cards.map((c) => ({
    ...c,
    fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
    fotosIrmaos: (c.irmaos_dados ?? []).map((i) =>
      i.foto_path ? (fotos.get(i.foto_path) ?? null) : null,
    ),
  }));

  // Inscritos do evento que ainda não viraram card
  let inscritos: Inscrito[] = [];
  if (evento) {
    const { data: ins } = await admin
      .from("inscricoes")
      .select("id, aluno_id, responsavel_nome, status_pagamento")
      .eq("evento_id", evento.id)
      .in("status_pagamento", ["pago", "pendente"])
      .not("aluno_id", "is", null);

    const alunoIds = [...new Set((ins ?? []).map((i) => i.aluno_id))];
    const { data: alunos } = alunoIds.length
      ? await admin
          .from("alunos")
          .select("id, nome_completo, serie, turma")
          .in("id", alunoIds)
      : { data: [] };

    const porId = new Map((alunos ?? []).map((a) => [a.id, a]));
    const jaTemCard = new Set(cards.map((c) => c.aluno_id));
    const porAluno = new Map<string, Inscrito>();

    for (const i of ins ?? []) {
      const a = porId.get(i.aluno_id);
      if (!a || jaTemCard.has(a.id)) continue;

      const pago = i.status_pagamento === "pago";
      const anterior = porAluno.get(a.id);

      // O mesmo aluno pode ter mais de uma inscrição (segunda tentativa
      // de pagamento, ingresso extra). Basta UMA paga pra ele contar
      // como pago — senão quem pagou cairia na lista de pendentes e
      // sairia desmarcado por engano.
      if (anterior) {
        if (pago) anterior.pago = true;
        continue;
      }

      porAluno.set(a.id, {
        alunoId: a.id,
        aluno_nome: a.nome_completo,
        serie: a.serie,
        turma: a.turma,
        responsavel: i.responsavel_nome,
        pago,
      });
    }
    // Mesma ordem da lista de cards: série, turma, nome.
    inscritos = ordenarPorTurma([...porAluno.values()]);
  }

  // Conta por card completo, não por coluna: com irmãos, um card pode
  // ter o vídeo do principal e ainda faltar o do irmão.
  const status = cards.map(statusDoCard);
  const prontos = status.filter((s) => s.completo).length;
  const faltamFotos = status.filter((s) => s.fotosFaltando > 0).length;
  const faltamVideos = status.filter((s) => s.videosFaltando > 0).length;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            Dia dos Pais — Vídeos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {evento
              ? `Lista dos inscritos em ${evento.nome}. Cada card vira 1/4 de folha com QR pro vídeo.`
              : `Evento "${NOME_DO_EVENTO}" não encontrado — confira o nome no cadastro de eventos.`}
          </p>
        </div>

        {cards.length > 0 && (
          <Button asChild>
            <Link href="/admin/dia-dos-pais/imprimir" target="_blank">
              <Printer className="size-4" />
              Folha de impressão
            </Link>
          </Button>
        )}
      </div>

      {cards.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Resumo label="Cards" valor={cards.length} />
          <Resumo
            label="Prontos"
            valor={prontos}
            alerta={prontos < cards.length}
          />
          <Resumo
            label="Falta foto"
            valor={faltamFotos}
            alerta={faltamFotos > 0}
          />
          <Resumo
            label="Falta vídeo"
            valor={faltamVideos}
            alerta={faltamVideos > 0}
          />
        </div>
      )}

      <PainelDiaDosPais
        cards={comFoto}
        inscritos={inscritos}
        eventoId={evento?.id ?? null}
      />
    </div>
  );
}

function Resumo({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-extrabold ${
          alerta ? "text-amadeus-yellow-dark" : "text-amadeus-blue"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
