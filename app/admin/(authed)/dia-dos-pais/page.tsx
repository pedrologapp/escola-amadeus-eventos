import Link from "next/link";
import { Printer } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERIES_GRUPOS } from "@/lib/constants";
import { assinarVarios, type VideoPais } from "@/lib/dia-dos-pais";
import { Button } from "@/components/ui/button";
import { PainelDiaDosPais, type CardComFoto } from "./painel";

/**
 * Admin do Dia dos Pais — gera os cards, recebe fotos/vídeos e manda
 * pra folha de impressão.
 */
export const dynamic = "force-dynamic";

/** Só pra miniatura na listagem; não precisa durar. */
const VALIDADE_SEGUNDOS = 60 * 60;

export default async function AdminDiaDosPaisPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("videos_pais")
    .select("*")
    .order("serie")
    .order("turma")
    .order("aluno_nome");

  const cards = (data ?? []) as VideoPais[];
  const fotos = await assinarVarios(
    cards.map((c) => c.foto_path),
    VALIDADE_SEGUNDOS,
  );

  const comFoto: CardComFoto[] = cards.map((c) => ({
    ...c,
    fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
  }));

  const comVideo = cards.filter((c) => c.video_path).length;
  const semFoto = cards.filter((c) => !c.foto_path).length;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            Dia dos Pais — Vídeos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada aluno vira um card de 1/4 de folha com QR pro vídeo dele.
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
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Resumo label="Cards" valor={cards.length} />
          <Resumo
            label="Com vídeo"
            valor={comVideo}
            alerta={comVideo < cards.length}
          />
          <Resumo label="Sem foto" valor={semFoto} alerta={semFoto > 0} />
        </div>
      )}

      <PainelDiaDosPais
        cards={comFoto}
        gruposDeSeries={SERIES_GRUPOS.map((g) => ({
          label: g.label,
          series: [...g.series],
        }))}
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
