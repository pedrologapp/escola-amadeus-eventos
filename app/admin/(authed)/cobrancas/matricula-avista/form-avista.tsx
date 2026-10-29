"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Download, Loader2, Search, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AlunoBusca, Leitura, Responsavel } from "@/lib/rematricula-2027-dados";
import { PRAZO_PROMOCAO, SERIES, reais, trocaDeSegmento, type NomeSerie } from "@/lib/rematricula-2027";
import { valoresAVista, type CondicaoPrazo, type FormaAVista } from "@/lib/matricula-avista";
import { formatarTelefone } from "@/lib/validators";
import { enviarComprovante, linkComprovante, registrarMatriculaAVista } from "../actions";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = (t: string) => Math.max(0, Number(t.replace(/\./g, "").replace(",", ".")) || 0);
const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
// A promoção (fechando até 28/10) já passou? Então o padrão é o preço de depois.
const prazoPadrao = (): CondicaoPrazo => (hoje() > "2026-10-28" ? "depois" : "promo");

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${ativo ? "border-amadeus-blue bg-amadeus-blue text-white" : "border-border bg-white text-amadeus-blue hover:bg-amadeus-blue-50"}`}
    >
      {children}
    </button>
  );
}

export function FormAVista({ alunos, leitura, responsaveis }: { alunos: AlunoBusca[]; leitura: Leitura | null; responsaveis: Responsavel[] }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [salvando, salvar] = useTransition();
  const [busca, setBusca] = useState("");
  const [novato, setNovato] = useState(!leitura);
  const [nomeNovato, setNomeNovato] = useState("");
  const [serie, setSerie] = useState<NomeSerie | "">(leitura?.serie2027 ?? "");
  const [baseTxt, setBaseTxt] = useState(leitura?.base != null ? String(leitura.base) : "");
  const [prazo, setPrazo] = useState<CondicaoPrazo>(prazoPadrao());
  const [livro, setLivro] = useState(true);
  const [extraTxt, setExtraTxt] = useState("");
  const [forma, setForma] = useState<FormaAVista>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [pixTxt, setPixTxt] = useState("");
  const [data, setData] = useState(hoje());
  const [responsavel, setResponsavel] = useState(responsaveis[0]?.nome ?? "");
  const [telefone, setTelefone] = useState(responsaveis[0] ? formatarTelefone(responsaveis[0].telefone) : "");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ id: string; url: string } | null>(null);
  const [envio, setEnvio] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();

  const achados = useMemo(() => {
    const q = semAcento(busca.trim());
    if (q.length < 2) return [];
    const partes = q.split(/\s+/);
    return alunos.filter((a) => partes.every((p) => semAcento(a.nome).includes(p))).slice(0, 8);
  }, [busca, alunos]);

  // Veterano no mesmo segmento parte da mensalidade de hoje (sem o livro); troca de segmento e novato, da tabela.
  const troca = !novato && !!serie && trocaDeSegmento(leitura?.aluno.serie ?? null, serie as NomeSerie);
  const base = !novato && !troca && num(baseTxt) > 0 ? num(baseTxt) : null;
  const nome = novato ? nomeNovato.trim() : leitura?.aluno.nome ?? "";
  const v = serie ? valoresAVista({ serie2027: serie as NomeSerie, base, prazo, livro, extra: num(extraTxt) }) : null;

  function escolher(id: number) {
    setBusca("");
    iniciar(() => router.push(`?aluno=${id}`));
  }

  function registrar() {
    setErro(null);
    if (!serie || !v) return setErro("Escolha a série de 2027.");
    salvar(async () => {
      const r = await registrarMatriculaAVista({
        alunoNome: nome, activesoftId: novato ? null : leitura?.aluno.id ?? null, novato, serie2027: serie, base,
        prazo, livro, extra: num(extraTxt), forma, parcelas: forma === "pix" ? 1 : parcelas, valorPix: num(pixTxt),
        dataPagamento: data, responsavel: responsavel.trim(), telefone, observacao: obs.trim() || undefined,
      });
      if (!r.ok) return setErro(r.error);
      const l = await linkComprovante(r.id);
      setFeito({ id: r.id, url: l.url ?? "" });
    });
  }

  if (feito) {
    return (
      <Card>
        <CardContent className="space-y-5 py-8">
          <div className="flex items-center gap-2 text-lg font-extrabold text-green-700">
            <CheckCircle className="size-6" /> Matrícula à vista registrada como paga
          </div>
          {feito.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={feito.url} alt="Comprovante" className="mx-auto w-full max-w-sm rounded-2xl border border-border shadow-sm" />
          )}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            Enviar o comprovante pelo WhatsApp da escola para <b>{responsavel}</b> · <b>{telefone}</b>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={enviando || envio === "ok"}
                onClick={() => enviar(async () => { const r = await enviarComprovante(feito.id, telefone); setEnvio(r.ok ? "ok" : r.erro ?? "Não foi enviado."); })}
              >
                {enviando ? <Loader2 className="animate-spin" /> : <Send />}
                {envio === "ok" ? "Enviado" : "Enviar pelo WhatsApp"}
              </Button>
              {feito.url && (
                <Button asChild variant="outline">
                  <a href={feito.url} target="_blank" rel="noreferrer"><Download /> Abrir / baixar</a>
                </Button>
              )}
              <Button asChild variant="ghost"><Link href="/admin/cobrancas">Voltar para cobranças</Link></Button>
            </div>
            {envio && envio !== "ok" && <p className="mt-2 text-xs text-destructive">{envio}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-amadeus-blue">1. Aluno</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Opcao ativo={!novato} onClick={() => setNovato(false)}>Aluno da escola</Opcao>
            <Opcao ativo={novato} onClick={() => { setNovato(true); setSerie(""); }}><UserPlus className="mr-1 inline size-4" />Novato</Opcao>
          </div>
          {novato ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome-novato">Nome do aluno</Label>
                <Input id="nome-novato" value={nomeNovato} onChange={(e) => setNomeNovato(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serie-novato">Série em 2027</Label>
                <select id="serie-novato" value={serie} onChange={(e) => setSerie(e.target.value as NomeSerie)} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm">
                  <option value="">Escolha a série</option>
                  {SERIES.map((s) => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar o aluno pelo nome" className="pl-9" />
                {achados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    {achados.map((a) => (
                      <button key={a.id} type="button" onClick={() => escolher(a.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-amadeus-blue-50">
                        <b>{a.nome}</b> <span className="text-muted-foreground">· {a.serie ?? a.turma}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {carregando && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lendo o que a família paga hoje...</p>}
              {leitura && (
                <div className="grid gap-3 rounded-2xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
                  <div><div className="text-xs text-muted-foreground">Aluno</div><b>{leitura.aluno.nome}</b> · {leitura.aluno.serie ?? "—"} em 2026</div>
                  <div className="space-y-1.5">
                    <Label htmlFor="serie-vet">Série em 2027</Label>
                    <select id="serie-vet" value={serie} onChange={(e) => setSerie(e.target.value as NomeSerie)} className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm">
                      <option value="">Escolha a série</option>
                      {SERIES.map((s) => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
                    </select>
                  </div>
                  {!troca ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="base">Mensalidade de hoje, sem o livro (lida do boleto)</Label>
                      <Input id="base" inputMode="decimal" value={baseTxt} onChange={(e) => setBaseTxt(e.target.value)} className="max-w-[200px]" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground sm:col-span-2">Muda de segmento em 2027: parte da tabela do segmento novo.</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-amadeus-blue">2. Valores (o encarte à vista)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Opcao ativo={prazo === "promo"} onClick={() => setPrazo("promo")}>Fechou até {PRAZO_PROMOCAO}</Opcao>
            <Opcao ativo={prazo === "depois"} onClick={() => setPrazo("depois")}>Fechou depois</Opcao>
          </div>
          <div className="flex flex-wrap gap-2">
            <Opcao ativo={livro} onClick={() => setLivro(true)}>Com os livros</Opcao>
            <Opcao ativo={!livro} onClick={() => setLivro(false)}>Sem os livros</Opcao>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extra">Desconto a mais da direção (R$, opcional)</Label>
            <Input id="extra" inputMode="decimal" value={extraTxt} onChange={(e) => setExtraTxt(e.target.value)} placeholder="0,00" className="max-w-[200px]" />
          </div>
          {v && (
            <div className="rounded-2xl border border-border bg-white p-4 text-sm">
              {/* a mesma conta do comprovante: anuidade + livros = subtotal; − descontos = total */}
              <Linha r={`Anuidade 2027 (12 × ${reais(v.mensalidade)})`} v={`+ ${reais(v.ano)}`} />
              {livro && <Linha r={`Livros 2027 (12 × ${reais(v.livro12x / 12)})`} v={`+ ${reais(v.livro12x)}`} />}
              <div className="flex justify-between border-t border-border py-1 font-bold"><span>Subtotal</span><span className="tabular-nums">{reais(v.ano + (livro ? v.livro12x : 0))}</span></div>
              <Linha r="Desconto à vista na anuidade (10%)" v={`− ${reais(v.desconto)}`} verde />
              {livro && <Linha r="Desconto à vista nos livros (10%)" v={`− ${reais(Math.round((v.livro12x - v.livro) * 100) / 100)}`} verde />}
              {v.extra > 0 && <Linha r="Desconto especial" v={`− ${reais(v.extra)}`} verde />}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                <b>= Total à vista</b><span className="text-2xl font-extrabold text-amadeus-blue">{reais(v.total)}</span>
              </div>
              <div className="text-right text-xs text-muted-foreground">equivale a {reais(Math.round((v.total / 12) * 100) / 100)} por mês</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-amadeus-blue">3. Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Opcao ativo={forma === "pix"} onClick={() => setForma("pix")}>Tudo no Pix</Opcao>
            <Opcao ativo={forma === "cartao"} onClick={() => setForma("cartao")}>Tudo no cartão</Opcao>
            <Opcao ativo={forma === "misto"} onClick={() => setForma("misto")}>Parte no Pix, parte no cartão</Opcao>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {forma === "misto" && (
              <div className="space-y-1.5">
                <Label htmlFor="pix">Quanto foi no Pix</Label>
                <Input id="pix" inputMode="decimal" value={pixTxt} onChange={(e) => setPixTxt(e.target.value)} placeholder="0,00" />
              </div>
            )}
            {forma !== "pix" && (
              <div className="space-y-1.5">
                <Label htmlFor="parcelas">Cartão em</Label>
                <select id="parcelas" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="data">Data do pagamento</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          {forma === "misto" && v && num(pixTxt) > 0 && num(pixTxt) < v.total && (
            <p className="text-xs text-muted-foreground">No cartão: {reais(v.total - num(pixTxt))} em {parcelas}x.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-amadeus-blue">4. Quem recebe o comprovante</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {responsaveis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {responsaveis.map((r) => (
                <Opcao key={r.telefone} ativo={telefone.replace(/\D/g, "") === r.telefone} onClick={() => { setResponsavel(r.nome); setTelefone(formatarTelefone(r.telefone)); }}>
                  {r.nome.split(" ")[0]} · {formatarTelefone(r.telefone)}
                </Opcao>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resp">Responsável</Label>
              <Input id="resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tel">WhatsApp (DDD + número)</Label>
              <Input id="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observação (só para a equipe, opcional)</Label>
            <Input id="obs" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
      <Button type="button" size="lg" disabled={salvando || !v || !nome} onClick={registrar}>
        {salvando ? <Loader2 className="animate-spin" /> : <CheckCircle />}
        Registrar como pago {v ? `· ${reais(v.total)}` : ""}
      </Button>
      <p className="text-xs text-muted-foreground">Registrar não envia nada. O comprovante só vai para o WhatsApp quando você clicar em enviar.</p>
    </div>
  );
}

function Linha({ r, v, verde }: { r: string; v: string; verde?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${verde ? "text-green-700" : ""}`}>
      <span>{r}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}
