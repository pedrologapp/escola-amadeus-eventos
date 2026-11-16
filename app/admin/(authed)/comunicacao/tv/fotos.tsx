"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ItemTv } from "@/lib/tv";
import { createClient } from "@/lib/supabase/client";
import { PlayerTv } from "@/app/admin/tv/player";
import { apagarItem, ativarItem, mudarAlbum, prepararFotoTv, salvarAlbum, salvarItem, type ItemForm } from "@/app/admin/(authed)/comunicacao/tv/actions";

/**
 * As telas com foto (Pedro, 16/11/2026): fotos da escola, conquistas e a nossa equipe. Do jeito dos avisos: a lista,
 * um "+ Novo" que abre os campos com a tela pronta do lado, e só passam na TV quando tem conteúdo.
 */

type Tipo = "foto" | "conquista" | "pessoa";

export const CONF_FOTOS: Record<Tipo, {
  bloco: string; titulo: string; dica: string; novo: string; icone: string;
  rotulo1: string; ex1: string; rotulo2?: string; ex2?: string; fotoObrigatoria: boolean;
}> = {
  foto: {
    bloco: "fotos", titulo: "Fotos da escola", dica: "Cada foto ocupa a TV inteira, com uma legenda curta.", novo: "Nova foto", icone: "camera",
    rotulo1: "Legenda (curta)", ex1: "Ex.: Feira de Conhecimentos, 13 de novembro", fotoObrigatoria: true,
  },
  conquista: {
    bloco: "conquistas", titulo: "Conquistas", dica: "Um aluno ou uma turma que ganhou algo. A foto é opcional.", novo: "Nova conquista", icone: "trofeu",
    rotulo1: "Quem", ex1: "Ex.: Maria Clara, 7º ano", rotulo2: "O que conquistou", ex2: "Ex.: 1º lugar na Olimpíada de Matemática", fotoObrigatoria: false,
  },
  pessoa: {
    bloco: "equipe", titulo: "Nossa equipe", dica: "Passa uma pessoa por dia, com foto, nome e função.", novo: "Nova pessoa", icone: "coracao",
    rotulo1: "Nome", ex1: "Ex.: Tia Ana", rotulo2: "Função", ex2: "Ex.: Professora do Grupo V", fotoObrigatoria: true,
  },
};

const dataBr = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");
const campo = "w-full rounded-xl border border-[#D5DDEB] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]";
const rotulo = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#8A95AA]";

/** Foto do celular (4–8 MB) vira ~300 KB antes de subir. */
async function comprimir(arquivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const e = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * e);
    c.height = Math.round(bmp.height * e);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await new Promise((ok) => c.toBlob((b) => ok(b ?? arquivo), "image/jpeg", 0.86));
  } catch {
    return arquivo;
  }
}

/** A tela como fica na TV, parada no fim da animação. */
function PreviaFoto({ tipo, f }: { tipo: Tipo; f: ItemForm }) {
  const dados: Record<string, unknown> =
    tipo === "foto" ? { imagem: f.imagem, legenda: f.titulo }
      : tipo === "conquista" ? { titulo: f.titulo || "Quem conquistou", texto: f.texto, imagem: f.imagem || null }
        : { nome: f.titulo || "Nome", funcao: f.texto, imagem: f.imagem };
  const roteiro = { hoje: "", atualizado: "previa", cenas: [{ id: CONF_FOTOS[tipo].bloco, chave: "previa", segundos: 999, dados }] };
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0B1430]">
      {f.imagem || tipo === "conquista" ? <PlayerTv roteiro={roteiro} previa congelada={{ cena: 0, t: 8 }} /> : (
        <div className="flex h-full items-center justify-center text-sm font-semibold text-white/60">Escolha a foto para ver como fica</div>
      )}
    </div>
  );
}

function Editor({ tipo, inicial, onPronto, onCancelar }: { tipo: Tipo; inicial: ItemForm; onPronto: () => void; onCancelar: () => void }) {
  const conf = CONF_FOTOS[tipo];
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [pendente, comecar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  const escolher = async (a: File | undefined) => {
    if (!a) return;
    setErro(null);
    setSubindo(true);
    try {
      const p = await prepararFotoTv(a.name);
      if (!p.ok) return setErro(p.erro);
      const corpo = await comprimir(a);
      const { error } = await createClient().storage.from("eventos").uploadToSignedUrl(p.path, p.token, corpo, { contentType: "image/jpeg" });
      if (error) return setErro("Não consegui enviar a foto. Tente de novo.");
      setF((x) => ({ ...x, imagem: p.url }));
    } finally {
      setSubindo(false);
    }
  };
  const salvar = () =>
    comecar(async () => {
      setErro(null);
      const r = await salvarItem(f);
      if (!r.ok) return setErro(r.erro);
      onPronto();
    });

  return (
    <div className="rounded-2xl bg-[#F4F7FC] p-4">
      <PreviaFoto tipo={tipo} f={f} />
      <div className="mt-4 space-y-3">
        <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
        <button type="button" disabled={subindo} onClick={() => arquivo.current?.click()} className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-[#C9D3E4] bg-white px-4 py-2.5 text-sm font-bold text-[#1B3B7C] hover:border-[#1B3B7C]">
          {subindo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {f.imagem ? "Trocar a foto" : conf.fotoObrigatoria ? "Escolher a foto" : "Escolher uma foto (opcional)"}
        </button>
        <div><span className={rotulo}>{conf.rotulo1}</span><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder={conf.ex1} className={`${campo} font-bold`} /></div>
        {conf.rotulo2 && <div><span className={rotulo}>{conf.rotulo2}</span><input value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder={conf.ex2} className={campo} /></div>}
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[#1B3B7C]">
          <label className="flex items-center gap-2">Aparece de <input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
          <label className="flex items-center gap-2">até <input type="date" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
        </div>
        <p className="text-xs text-[#8A95AA]">Sem data: aparece desde já e não sai sozinho. Use só fotos com autorização de imagem das famílias.</p>
        {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
        <div className="flex items-center gap-2">
          <button type="button" disabled={pendente || subindo || !f.titulo.trim() || (conf.fotoObrigatoria && !f.imagem)} onClick={salvar} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {f.id ? "Salvar" : "Colocar na TV"}
          </button>
          <button type="button" onClick={onCancelar} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5A6478] hover:bg-black/5">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/** Sobe uma foto (já reduzida) e devolve o endereço público. */
async function subir(a: File): Promise<string | null> {
  const p = await prepararFotoTv(a.name);
  if (!p.ok) return null;
  const corpo = await comprimir(a);
  const { error } = await createClient().storage.from("eventos").uploadToSignedUrl(p.path, p.token, corpo, { contentType: "image/jpeg" });
  return error ? null : p.url;
}

/**
 * Álbuns de evento (Pedro, 16/11/2026: "um espaço para eventos esporádicos, para colocar as fotos que recebemos"):
 * o nome do evento, as datas em que passa e as fotos, várias de uma vez. Na TV, cada álbum é uma tela que passa as
 * fotos uma depois da outra, com o nome do evento embaixo.
 */
export function AlbunsTv({ itens, hoje, onMudou }: { itens: ItemTv[]; hoje: string; onMudou: () => void }) {
  const [aberto, setAberto] = useState<{ nome: string; inicio: string; fim: string; existente: boolean } | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [subindo, setSubindo] = useState<{ feitas: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  // as fotos agrupadas pelo nome do evento
  const albuns = new Map<string, ItemTv[]>();
  for (const i of itens.filter((x) => x.tipo === "foto")) albuns.set(i.titulo, [...(albuns.get(i.titulo) ?? []), i]);
  const lista = [...albuns.entries()].map(([nome, fs]) => ({ nome, fotos: fs, ativo: fs.some((f) => f.ativo), inicio: fs[0].inicio, fim: fs[0].fim }));

  const escolher = async (arqs: FileList | null) => {
    if (!arqs?.length) return;
    setErro(null);
    const todas = [...arqs].filter((a) => a.type.startsWith("image/"));
    setSubindo({ feitas: 0, total: todas.length });
    const novas: string[] = [];
    for (const a of todas) {
      const url = await subir(a);
      if (url) novas.push(url);
      setSubindo((s) => (s ? { ...s, feitas: s.feitas + 1 } : s));
    }
    setSubindo(null);
    if (novas.length < todas.length) setErro(`${todas.length - novas.length} foto(s) não subiram. Tente de novo só com elas.`);
    setFotos((f) => [...f, ...novas]);
  };
  const salvar = () =>
    comecar(async () => {
      if (!aberto) return;
      setErro(null);
      const r = await salvarAlbum(aberto.nome, fotos, aberto.inicio, aberto.fim);
      if (!r.ok) return setErro(r.erro);
      setAberto(null);
      setFotos([]);
      onMudou();
    });
  const acao = (fn: () => Promise<{ ok: boolean }>) => comecar(async () => { if ((await fn()).ok) onMudou(); });
  const estado = (a: (typeof lista)[number]) => {
    if (!a.ativo) return { txt: "desligado", no: false };
    if (a.fim && a.fim < hoje) return { txt: "já passou", no: false };
    if (a.inicio && a.inicio > hoje) return { txt: `a partir de ${dataBr(a.inicio)}`, no: false };
    return { txt: a.fim ? `na TV até ${dataBr(a.fim)}` : "na TV", no: true };
  };

  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E8F2]">
      <h2 className="text-lg font-extrabold text-[#1B3B7C]">Fotos dos eventos</h2>
      <p className="text-sm text-[#5A6478]">Aconteceu um evento? Escreva o nome e escolha as fotos, várias de uma vez. Na TV, as fotos passam uma depois da outra, com o nome do evento.</p>

      {aberto ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#F4F7FC] p-4">
          {aberto.existente ? (
            <p className="text-[15px] font-bold text-[#1A2240]">Mais fotos em “{aberto.nome}”</p>
          ) : (
            <div><span className={rotulo}>Nome do evento</span><input autoFocus value={aberto.nome} onChange={(e) => setAberto({ ...aberto, nome: e.target.value })} placeholder="Ex.: Feira de Empreendedorismo" className={`${campo} font-bold`} /></div>
          )}
          <input ref={arquivo} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { escolher(e.target.files); e.target.value = ""; }} />
          <button type="button" disabled={!!subindo} onClick={() => arquivo.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9D3E4] bg-white py-5 text-[15px] font-bold text-[#1B3B7C] hover:border-[#1B3B7C]">
            {subindo ? <><Loader2 className="size-5 animate-spin" /> Enviando {subindo.feitas} de {subindo.total}…</> : <><ImagePlus className="size-5" /> {fotos.length ? "Escolher mais fotos" : "Escolher as fotos"}</>}
          </button>
          {fotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {fotos.map((u, k) => (
                <div key={u} className="group relative aspect-video overflow-hidden rounded-lg bg-[#0B1430]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button type="button" aria-label="Tirar esta foto" onClick={() => setFotos(fotos.filter((_, j) => j !== k))} className="absolute right-1 top-1 hidden rounded-md bg-black/60 p-1 text-white group-hover:block"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {!aberto.existente && (
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[#1B3B7C]">
              <label className="flex items-center gap-2">Passa de <input type="date" value={aberto.inicio} onChange={(e) => setAberto({ ...aberto, inicio: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
              <label className="flex items-center gap-2">até <input type="date" value={aberto.fim} onChange={(e) => setAberto({ ...aberto, fim: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
            </div>
          )}
          <p className="text-xs text-[#8A95AA]">Use só fotos com autorização de imagem das famílias.</p>
          {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
          <div className="flex items-center gap-2">
            <button type="button" disabled={pendente || !!subindo || !fotos.length || !aberto.nome.trim()} onClick={salvar} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Colocar na TV{fotos.length ? ` (${fotos.length} foto${fotos.length > 1 ? "s" : ""})` : ""}
            </button>
            <button type="button" onClick={() => { setAberto(null); setFotos([]); setErro(null); }} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5A6478] hover:bg-black/5">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          {lista.length > 0 && (
            <ul className="mt-3 space-y-2">
              {lista.map((a) => {
                const s = estado(a);
                return (
                  <li key={a.nome} className={`rounded-2xl p-2 ring-1 ring-[#E3E8F2] ${s.no ? "" : "opacity-60"}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 -space-x-4">
                        {a.fotos.slice(0, 3).map((f) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={f.id} src={f.imagem ?? ""} alt="" className="h-10 w-14 rounded-lg object-cover ring-2 ring-white" />
                        ))}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-[#1A2240]">{a.nome}</span>
                        <span className={`text-xs font-semibold ${s.no ? "text-emerald-700" : "text-[#8A95AA]"}`}>{a.fotos.length} foto{a.fotos.length > 1 ? "s" : ""} · {s.txt}</span>
                      </span>
                      <button type="button" aria-label="Pôr mais fotos" title="Pôr mais fotos" onClick={() => setAberto({ nome: a.nome, inicio: a.inicio ?? "", fim: a.fim ?? "", existente: true })} className="inline-flex size-8 items-center justify-center rounded-lg text-[#1B3B7C] hover:bg-[#EEF2FA]"><Plus className="size-4" /></button>
                      <button type="button" role="switch" aria-checked={a.ativo} aria-label={a.ativo ? "Tirar da TV" : "Voltar para a TV"} disabled={pendente} onClick={() => acao(() => mudarAlbum(a.nome, { ativo: !a.ativo }))} className={`mx-1 h-5 w-9 rounded-full p-0.5 ${a.ativo ? "bg-emerald-500" : "bg-[#CBD3E1]"}`}>
                        <span className={`block size-4 rounded-full bg-white shadow transition ${a.ativo ? "translate-x-4" : ""}`} />
                      </button>
                      <button type="button" aria-label="Apagar o álbum" disabled={pendente} onClick={() => { if (window.confirm(`Apagar o álbum “${a.nome}” da TV?`)) acao(() => mudarAlbum(a.nome, { apagar: true })); }} className="inline-flex size-8 items-center justify-center rounded-lg text-[#5A6478] hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => setAberto({ nome: "", inicio: hoje, fim: "", existente: false })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9D3E4] py-4 text-[15px] font-bold text-[#1B3B7C] hover:border-[#1B3B7C] hover:bg-[#F4F7FC]">
            <Plus className="size-5" /> Novo álbum de evento
          </button>
        </>
      )}
    </section>
  );
}

export function FotosTv({ tipo, itens, hoje, onMudou }: { tipo: Tipo; itens: ItemTv[]; hoje: string; onMudou: () => void }) {
  if (tipo === "foto") return <AlbunsTv itens={itens} hoje={hoje} onMudou={onMudou} />;
  return <FotosItens tipo={tipo} itens={itens} hoje={hoje} onMudou={onMudou} />;
}

function FotosItens({ tipo, itens, hoje, onMudou }: { tipo: Tipo; itens: ItemTv[]; hoje: string; onMudou: () => void }) {
  const conf = CONF_FOTOS[tipo];
  const [editando, setEditando] = useState<ItemForm | null>(null);
  const [pendente, comecar] = useTransition();
  const lista = itens.filter((i) => i.tipo === tipo);
  const novo: ItemForm = { tipo, titulo: "", texto: "", icone: "", data: "", inicio: "", fim: "", imagem: "" };
  const abrir = (i: ItemTv) => setEditando({ id: i.id, tipo, titulo: i.titulo, texto: i.texto, icone: "", data: "", inicio: i.inicio ?? "", fim: i.fim ?? "", imagem: i.imagem ?? "" });
  const acao = (fn: () => Promise<{ ok: boolean }>) => comecar(async () => { if ((await fn()).ok) onMudou(); });
  const situacao = (i: ItemTv) => {
    if (!i.ativo) return { txt: "desligado", no: false };
    if (i.fim && i.fim < hoje) return { txt: "já passou", no: false };
    if (i.inicio && i.inicio > hoje) return { txt: `a partir de ${dataBr(i.inicio)}`, no: false };
    return { txt: i.fim ? `na TV até ${dataBr(i.fim)}` : "na TV", no: true };
  };

  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E8F2]">
      <h2 className="text-lg font-extrabold text-[#1B3B7C]">{conf.titulo}</h2>
      <p className="text-sm text-[#5A6478]">{conf.dica}</p>
      {editando ? (
        <div className="mt-4"><Editor key={editando.id ?? "novo"} tipo={tipo} inicial={editando} onPronto={() => { setEditando(null); onMudou(); }} onCancelar={() => setEditando(null)} /></div>
      ) : (
        <>
          {lista.length > 0 && (
            <ul className="mt-3 space-y-1">
              {lista.map((i) => {
                const s = situacao(i);
                return (
                  <li key={i.id} className={`group flex items-center gap-3 rounded-xl p-2 hover:bg-[#F4F7FC] ${s.no ? "" : "opacity-60"}`}>
                    <button type="button" onClick={() => abrir(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#1E3F86] to-[#0B2260]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.imagem || `/tv/icones/${conf.icone}.webp`} alt="" className={i.imagem ? "h-full w-full object-cover" : "h-[82%] w-auto object-contain"} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-[#1A2240]">{i.titulo}</span>
                        <span className={`text-xs font-semibold ${s.no ? "text-emerald-700" : "text-[#8A95AA]"}`}>{s.txt}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100">
                      <button type="button" aria-label="Mudar" onClick={() => abrir(i)} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-black/5"><Pencil className="size-4" /></button>
                      <button type="button" role="switch" aria-checked={i.ativo} aria-label={i.ativo ? "Tirar da TV" : "Voltar para a TV"} disabled={pendente} onClick={() => acao(() => ativarItem(i.id, !i.ativo))} className={`mx-1 h-5 w-9 rounded-full p-0.5 ${i.ativo ? "bg-emerald-500" : "bg-[#CBD3E1]"}`}>
                        <span className={`block size-4 rounded-full bg-white shadow transition ${i.ativo ? "translate-x-4" : ""}`} />
                      </button>
                      <button type="button" aria-label="Apagar" disabled={pendente} onClick={() => { if (window.confirm("Apagar da TV?")) acao(() => apagarItem(i.id)); }} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => setEditando(novo)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9D3E4] py-4 text-[15px] font-bold text-[#1B3B7C] hover:border-[#1B3B7C] hover:bg-[#F4F7FC]">
            <Plus className="size-5" /> {conf.novo}
          </button>
        </>
      )}
    </section>
  );
}
