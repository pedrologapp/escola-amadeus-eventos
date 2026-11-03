import { Hoje } from "./hoje";

/** "Hoje": a primeira página do painel novo. A tela mora em ./hoje (também é a Visão geral do admin.eventos). */
export const dynamic = "force-dynamic";

export default async function PaginaHoje({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  return <Hoje aluno={aluno} base="/painel" />;
}
