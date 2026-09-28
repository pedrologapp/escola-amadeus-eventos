"use client";

/* eslint-disable @next/next/no-img-element -- prévias vêm da rota /api/eventos/cartaz-caderno */
import { useEffect, useState } from "react";
import { Check, Download, ImageOff, Loader2, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FORMATOS, type Detalhe, type Formato } from "@/lib/cartaz";
import { codificarCaderno, type EspecCaderno } from "@/lib/cartaz-caderno";
import { lerFotoParaCartaz, prepararFotoCartaz, type LeituraCaderno } from "./actions";

export interface FatosEvento {
  nome: string;
  data: string;
  hora: string | null;
  local: string | null;
  preco: string | null;
  link: string;
  fotos: string[];
  resumo: string;
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="flex items-center gap-2 font-bold text-amadeus-blue">
        <span className="grid size-6 place-items-center rounded-full bg-amadeus-blue text-xs text-white">{n}</span> {titulo}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// No domínio do admin (admin.eventos...) tudo que não é /admin é redirecionado, então
// a imagem precisa vir do domínio do site, onde a rota de desenho mora.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://eventos.escolaamadeus.com").replace(/\/+$/, "");
const url = (e: EspecCaderno, baixar = false) => `${SITE}/api/eventos/cartaz-caderno?d=${codificarCaderno(e)}${baixar ? "&baixar=1" : "&escala=0.45"}`;

const linhas = (s: string, n: number) => s.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, n);

function Campo({ rotulo, valor, onChange, linhasTexto }: { rotulo: string; valor: string; onChange: (v: string) => void; linhasTexto?: number }) {
  const cls = "mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue";
  return (
    <label className="block font-semibold">
      {rotulo}
      {linhasTexto ? <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={linhasTexto} className={cls} /> : <input value={valor} onChange={(e) => onChange(e.target.value)} className={cls} />}
    </label>
  );
}

/**
 * modo "evento": parte do cadastro e da foto do evento.
 * modo "texto": encarte avulso — a escola escreve o texto (aviso, comunicado,
 * campanha) e a IA organiza no estilo caderno; foto é opcional.
 */
export function EditorCartaz({ fatos, modo = "evento" }: { fatos: FatosEvento; modo?: "evento" | "texto" }) {
  const deTexto = modo === "texto";
  const [texto, setTexto] = useState("");
  const [formato, setFormato] = useState<Formato>("a4");
  const [detalhe, setDetalhe] = useState<Detalhe>("detalhado");
  const [frase, setFrase] = useState("");
  const [foto, setFoto] = useState<string | null>(fatos.fotos[0] ?? null);
  const [fotos, setFotos] = useState(fatos.fotos);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoFoto, setTipoFoto] = useState<LeituraCaderno["tipoFoto"] | null>(null);
  const [usarFoto, setUsarFoto] = useState(false);
  const [edicao, setEdicao] = useState<EspecCaderno | null>(null);
  const [previa, setPrevia] = useState<EspecCaderno | null>(null);

  // O tamanho pode mudar depois sem ler a foto de novo.
  const final: EspecCaderno | null = edicao ? { ...edicao, formato, foto: usarFoto ? foto : null } : null;
  const chaveFinal = final ? codificarCaderno(final) : "";
  // A prévia só redesenha quando para de digitar (cada desenho leva uns segundos).
  useEffect(() => {
    const t = setTimeout(() => setPrevia(final), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chaveFinal resume o conteúdo de final
  }, [chaveFinal]);

  const enviarFoto = async (arquivo: File) => {
    setEnviandoFoto(true);
    setErro(null);
    try {
      const p = await prepararFotoCartaz(arquivo.name);
      if (!p.ok) throw new Error(p.erro);
      const { error } = await createClient().storage.from("eventos").uploadToSignedUrl(p.path, p.token, arquivo, { contentType: arquivo.type || "image/jpeg" });
      if (error) throw new Error(error.message);
      setFotos((f) => [p.url, ...f]);
      setFoto(p.url);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviandoFoto(false);
    }
  };

  const ler = async () => {
    setGerando(true);
    setErro(null);
    const r = await lerFotoParaCartaz({ fatos: fatos.resumo, foto, detalhe, frase, texto: deTexto ? texto : undefined });
    setGerando(false);
    if (!r.ok || !r.leitura) return setErro(r.erro ?? "Não consegui ler a foto.");
    const l = r.leitura;
    setTipoFoto(l.tipoFoto);
    // Flyer não entra como foto: as informações dele viram o cartaz novo.
    setUsarFoto(l.tipoFoto === "foto");
    setEdicao({
      formato,
      etiqueta: l.etiqueta,
      titulo: l.titulo || fatos.nome,
      tituloMarca: l.tituloMarca,
      chamada: l.chamada,
      chamadaForte: l.chamadaForte,
      notas: l.notas,
      publicoTitulo: l.publicoTitulo,
      publico: l.publico,
      itens: l.itens,
      valores: detalhe === "detalhado" ? l.valores : [],
      ondeTitulo: l.ondeTitulo || fatos.local || "",
      ondeLinhas: l.ondeLinhas,
      qrRotulo: deTexto ? "Saiba mais" : "Inscrição",
      link: detalhe === "detalhado" && fatos.link ? fatos.link : null,
      foto: null,
      legendaFoto: l.legendaFoto,
    });
  };

  const muda = (p: Partial<EspecCaderno>) => edicao && setEdicao({ ...edicao, ...p });
  const mudaNota = (i: number, campo: "v" | "r", valor: string) => {
    if (!edicao) return;
    const n = [0, 1].map((k) => ({ v: edicao.notas[k]?.v ?? "", r: edicao.notas[k]?.r ?? "" }));
    n[i][campo] = valor;
    muda({ notas: n.filter((x) => x.v || x.r) });
  };
  const proporcao = `${FORMATOS[formato].w} / ${FORMATOS[formato].h}`;

  return (
    <div className="mt-6 grid gap-5">
      <Passo n={1} titulo="Tamanho">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => {
            const F = FORMATOS[f];
            return (
              <button key={f} type="button" onClick={() => setFormato(f)} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${formato === f ? "border-amadeus-blue bg-amadeus-blue-50 ring-2 ring-amadeus-blue/30" : "border-border hover:border-amadeus-blue/50"}`}>
                <span className="flex h-24 items-center justify-center">
                  <span className="block rounded-md border border-[#E4DCC8] bg-[#FAF7F0] shadow" style={{ height: 88, width: (88 * F.w) / F.h }} />
                </span>
                <span className="text-sm font-bold">{F.rotulo}</span>
                <span className="text-xs text-muted-foreground">{F.detalhe}</span>
              </button>
            );
          })}
        </div>
      </Passo>

      <Passo n={2} titulo="Quanta informação">
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["conciso", "Conciso", "Título, chamada, data, horário, público e poucos destaques. Bom para story."],
            ["detalhado", "Detalhado", "Tudo o que a foto e o cadastro trazem: atividades, valores, local e QR code para inscrição."],
          ] as const).map(([v, t, d]) => (
            <button key={v} type="button" onClick={() => setDetalhe(v)} className={`rounded-xl border p-4 text-left ${detalhe === v ? "border-amadeus-blue bg-amadeus-blue-50 ring-2 ring-amadeus-blue/30" : "border-border hover:border-amadeus-blue/50"}`}>
              <span className="font-bold">{t}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
      </Passo>

      <Passo n={3} titulo="Quer alguma frase? (opcional)">
        <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Ex.: Um dia inteiro de diversão com os amigos" className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-amadeus-blue" />
        <p className="mt-1.5 text-xs text-muted-foreground">Se deixar em branco, a IA escreve a chamada a partir da foto e do evento.</p>
      </Passo>

      {deTexto && (
        <Passo n={4} titulo="O que vai no encarte">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} placeholder={"Cole ou escreva o texto do aviso, comunicado ou convite.\nEx.: Reunião de pais do 6º ano na quinta, 09/10, às 18h30, no auditório. Pauta: projeto Arbória, notas do 3º bimestre e passeio de novembro."} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-amadeus-blue" />
          <p className="mt-1.5 text-xs text-muted-foreground">A IA organiza o texto em título, post-its (datas e horários), público, destaques e local. Você revisa tudo antes de baixar.</p>
        </Passo>
      )}

      <Passo n={deTexto ? 5 : 4} titulo={deTexto ? "Foto (opcional)" : "Foto ou material do evento"}>
        <p className="-mt-2 mb-3 text-xs text-muted-foreground">{deTexto ? "Uma foto entra no encarte com moldura de polaroid. Se for um material com texto, a IA também lê as informações dele." : "Se for um material pronto (flyer), a IA lê as informações dele e monta um cartaz novo no estilo caderno da escola."}</p>
        <div className="flex flex-wrap gap-3">
          {fotos.map((f) => (
            <button key={f} type="button" onClick={() => setFoto(f)} className={`relative size-24 overflow-hidden rounded-xl border-2 ${foto === f ? "border-amadeus-blue" : "border-transparent"}`}>
              <img src={f} alt="" className="size-full object-cover" />
              {foto === f && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-amadeus-blue text-white"><Check className="size-3" /></span>}
            </button>
          ))}
          <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-center text-xs text-muted-foreground hover:border-amadeus-blue">
            {enviandoFoto ? <Loader2 className="size-5 animate-spin" /> : <span className="flex flex-col items-center gap-1"><Upload className="size-5" /> Enviar outra</span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && enviarFoto(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setFoto(null)} className={`grid size-24 place-items-center rounded-xl border-2 text-xs text-muted-foreground ${foto === null ? "border-amadeus-blue" : "border-dashed border-border"}`}>
            <span className="flex flex-col items-center gap-1"><ImageOff className="size-5" /> Sem foto</span>
          </button>
        </div>
      </Passo>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={ler} disabled={gerando || (deTexto && !texto.trim() && !foto)} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-5 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50">
          {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {deTexto
            ? gerando ? "Montando o encarte…" : edicao ? "Montar de novo" : "Montar o encarte"
            : gerando ? "Lendo a foto e montando o cartaz…" : edicao ? "Ler de novo" : "Ler a foto e montar o cartaz"}
        </button>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
      </div>

      {edicao && final && (
        <section className="grid gap-5 rounded-2xl border border-border/60 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-sm">
            <p className="font-bold text-amadeus-blue">Revisar e baixar</p>
            {tipoFoto === "flyer" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">A imagem é um material com informações: a IA leu o que está escrito e montou o cartaz. Confira os dados antes de baixar.</p>}
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Campo rotulo="Etiqueta" valor={edicao.etiqueta} onChange={(v) => muda({ etiqueta: v.toUpperCase() })} />
              <Campo rotulo="Título" valor={edicao.titulo} onChange={(v) => muda({ titulo: v })} />
            </div>
            <Campo rotulo="Parte do título grifada de amarelo" valor={edicao.tituloMarca} onChange={(v) => muda({ tituloMarca: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Chamada" valor={edicao.chamada} onChange={(v) => muda({ chamada: v })} linhasTexto={2} />
              <Campo rotulo="Continuação em negrito" valor={edicao.chamadaForte} onChange={(v) => muda({ chamadaForte: v })} linhasTexto={2} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-lg bg-[#FFF6D6] p-2">
                  <p className="text-xs font-bold">Post-it {i + 1}</p>
                  <input value={edicao.notas[i]?.v ?? ""} placeholder={i ? "Ex.: 7h30" : "Ex.: 15/10/2026"} onChange={(e) => mudaNota(i, "v", e.target.value)} className="mt-1 w-full rounded border border-border px-2 py-1" />
                  <input value={edicao.notas[i]?.r ?? ""} placeholder={i ? "Ex.: SAÍDA DA ESCOLA" : "Ex.: QUINTA-FEIRA"} onChange={(e) => mudaNota(i, "r", e.target.value)} className="mt-1 w-full rounded border border-border px-2 py-1 text-xs" />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Público (título)" valor={edicao.publicoTitulo} onChange={(v) => muda({ publicoTitulo: v })} />
              <Campo rotulo="Público (um por linha)" valor={edicao.publico.join("\n")} onChange={(v) => muda({ publico: linhas(v, 4) })} linhasTexto={2} />
            </div>
            <Campo rotulo="Destaques / atividades (um por linha, até 6)" valor={edicao.itens.join("\n")} onChange={(v) => muda({ itens: v.split("\n").slice(0, 6) })} linhasTexto={4} />
            {formato !== "quadrado" && (
              <Campo
                rotulo="Valores (um por linha, ex.: Aluno = R$ 80,00)"
                valor={edicao.valores.map((x) => `${x.rotulo} = ${x.valor}`).join("\n")}
                onChange={(v) => muda({ valores: linhas(v, 4).map((l) => { const [r, ...resto] = l.split("="); return { rotulo: r.trim(), valor: resto.join("=").trim() }; }) })}
                linhasTexto={2}
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Onde é" valor={edicao.ondeTitulo} onChange={(v) => muda({ ondeTitulo: v })} />
              <Campo rotulo="Detalhes do local (até 2 linhas)" valor={edicao.ondeLinhas.join("\n")} onChange={(v) => muda({ ondeLinhas: linhas(v, 2) })} linhasTexto={2} />
            </div>
            {fatos.link ? (
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={!!edicao.link} onChange={(e) => muda({ link: e.target.checked ? fatos.link : null })} /> QR code para inscrição
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Campo rotulo="Link do QR code (opcional)" valor={edicao.link ?? ""} onChange={(v) => muda({ link: v.trim() || null })} />
                <Campo rotulo="Texto do QR" valor={edicao.qrRotulo} onChange={(v) => muda({ qrRotulo: v })} />
              </div>
            )}
            {foto && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={usarFoto} onChange={(e) => setUsarFoto(e.target.checked)} /> Colocar a foto no cartaz (moldura de polaroid)
                </label>
                {usarFoto && <Campo rotulo="Legenda da foto" valor={edicao.legendaFoto} onChange={(v) => muda({ legendaFoto: v })} />}
              </div>
            )}
            <a href={url(final, true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">
              <Download className="size-4" /> Baixar {deTexto ? "encarte" : "cartaz"} (PNG)
            </a>
          </div>
          <img key={previa ? codificarCaderno(previa) : "vazio"} src={previa ? url(previa) : undefined} alt="Prévia" className="w-full self-start rounded-xl border border-border bg-muted" style={{ aspectRatio: proporcao }} />
        </section>
      )}
    </div>
  );
}
