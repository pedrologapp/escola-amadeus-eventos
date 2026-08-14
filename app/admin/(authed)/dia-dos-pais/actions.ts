"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_DIA_DOS_PAIS,
  gerarCodigo,
  type Irmao,
  type VideoPais,
} from "@/lib/dia-dos-pais";

/**
 * Server actions do módulo Dia dos Pais.
 *
 * Upload: o arquivo NÃO passa por aqui. A action só cria uma signed
 * upload URL e o navegador manda o arquivo direto pro Storage. Server
 * action tem limite de 4MB de body (next.config.ts) — vídeo não cabe.
 */

async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
  return user;
}

/**
 * Cria os cards dos alunos escolhidos na lista de inscritos.
 *
 * Recebe IDs de ALUNO (e não de inscrição) porque é o aluno que tem
 * card: se a mesma família aparecer em duas inscrições, continua sendo
 * um card só, garantido pelo índice unique em videos_pais.aluno_id.
 *
 * Idempotente: quem já tem card é ignorado em silêncio, então dá pra
 * clicar "gerar" de novo depois que mais gente pagar.
 */
export async function gerarCardsDosAlunos(
  eventoId: string,
  alunoIds: string[],
) {
  await exigirLogin();
  if (alunoIds.length === 0) return { error: "Selecione ao menos um aluno." };

  const admin = createAdminClient();

  const { data: alunos, error: erroAlunos } = await admin
    .from("alunos")
    .select("id, nome_completo, serie, turma")
    .in("id", alunoIds);

  if (erroAlunos) return { error: `Erro ao buscar alunos: ${erroAlunos.message}` };
  if (!alunos?.length) return { error: "Nenhum aluno encontrado." };

  const { data: existentes } = await admin
    .from("videos_pais")
    .select("aluno_id");
  const jaTem = new Set((existentes ?? []).map((e) => e.aluno_id));

  const novos = alunos
    .filter((a) => !jaTem.has(a.id))
    .map((a) => ({
      codigo: gerarCodigo(),
      evento_id: eventoId,
      aluno_id: a.id,
      aluno_nome: a.nome_completo,
      serie: a.serie,
      turma: a.turma,
    }));

  if (novos.length === 0) {
    return { ok: true, criados: 0, mensagem: "Os selecionados já tinham card." };
  }

  const { error } = await admin.from("videos_pais").insert(novos);
  if (error) return { error: `Erro ao criar cards: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true, criados: novos.length };
}

/**
 * Procura o irmão entre os alunos da escola enquanto se digita.
 *
 * Marca quem já tem card próprio: esse é o caso perigoso — sem avisar,
 * a família receberia dois cards (o do irmão sozinho e o conjunto).
 */
export async function procurarIrmaos(termo: string) {
  await exigirLogin();
  if (termo.trim().length < 3) return { ok: true, alunos: [] };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("buscar_alunos", {
    termo: termo.trim(),
  });
  if (error) return { error: `Erro na busca: ${error.message}` };

  const alunos = (data ?? []).slice(0, 8) as {
    id: string;
    nome_completo: string;
    serie: string | null;
    turma: string | null;
  }[];
  if (alunos.length === 0) return { ok: true, alunos: [] };

  const { data: cards } = await admin
    .from("videos_pais")
    .select("id, codigo, aluno_id")
    .in(
      "aluno_id",
      alunos.map((a) => a.id),
    );
  const porAluno = new Map((cards ?? []).map((c) => [c.aluno_id, c]));

  return {
    ok: true,
    alunos: alunos.map((a) => ({
      alunoId: a.id,
      nome: a.nome_completo,
      serie: a.serie,
      turma: a.turma,
      cardProprio: porAluno.get(a.id)?.codigo ?? null,
    })),
  };
}

/**
 * Adiciona um irmão ao card.
 *
 * Se o irmão já tiver card próprio, este card ABSORVE o dele: leva a
 * foto e o vídeo que já estavam lá e apaga o card duplicado. Sem isso a
 * família receberia dois cards, e o erro só apareceria na entrega.
 *
 * `alunoId` é opcional: irmão que estuda em outra escola entra só pelo
 * nome, e aí não há card pra absorver.
 */
export async function adicionarIrmao(
  id: string,
  irmao: { nome: string; alunoId?: string | null },
) {
  await exigirLogin();

  const nome = irmao.nome.trim();
  if (!nome) return { error: "Informe o nome do irmão." };

  const admin = createAdminClient();
  const { data: card, error: erroCard } = await admin
    .from("videos_pais")
    .select("id, irmaos_dados")
    .eq("id", id)
    .single<Pick<VideoPais, "id" | "irmaos_dados">>();

  if (erroCard || !card) return { error: "Card não encontrado." };

  const atuais = card.irmaos_dados ?? [];
  if (atuais.length >= 3) {
    return { error: "Um card comporta no máximo 3 irmãos." };
  }
  if (atuais.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) {
    return { error: `${nome} já está neste card.` };
  }

  // Absorve o card do irmão, se existir
  let fotoPath: string | null = null;
  let videoPath: string | null = null;
  let absorvido: string | null = null;

  if (irmao.alunoId) {
    const { data: duplicado } = await admin
      .from("videos_pais")
      .select("id, codigo, foto_path, video_path")
      .eq("aluno_id", irmao.alunoId)
      .maybeSingle();

    if (duplicado && duplicado.id !== id) {
      fotoPath = duplicado.foto_path;
      videoPath = duplicado.video_path;
      absorvido = duplicado.codigo;
      // Só remove a linha; os arquivos continuam no Storage e passam a
      // ser referenciados por este card.
      await admin.from("videos_pais").delete().eq("id", duplicado.id);
    }
  }

  const novos: Irmao[] = [
    ...atuais,
    {
      nome,
      aluno_id: irmao.alunoId ?? null,
      foto_path: fotoPath,
      video_path: videoPath,
    },
  ];

  const { error } = await admin
    .from("videos_pais")
    .update({ irmaos_dados: novos, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: `Erro ao salvar irmão: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true, absorvido };
}

/**
 * Escolhe se os irmãos aparecem num vídeo só ou cada um no seu.
 *
 * Não dá pra deduzir do arquivo: algumas famílias gravaram as crianças
 * juntas, outras separadas. As fotos continuam uma por criança nos dois
 * casos — num retrato só, os dois saem cortados.
 */
export async function definirVideoConjunto(id: string, conjunto: boolean) {
  await exigirLogin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("videos_pais")
    .update({ video_conjunto: conjunto, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}

/**
 * Ajusta o brilho com que a foto é exibida.
 *
 * Só o número é guardado — o arquivo original fica intocado no Storage.
 * Dá pra experimentar, comparar e voltar ao original sem reenviar nada.
 *
 * @param indiceIrmao null = aluno principal; 0,1,2 = irmão.
 */
export async function definirBrilhoFoto(
  id: string,
  brilho: number,
  indiceIrmao: number | null = null,
) {
  await exigirLogin();

  const valor = Math.min(250, Math.max(100, Math.round(brilho)));
  const admin = createAdminClient();

  if (indiceIrmao === null) {
    const { error } = await admin
      .from("videos_pais")
      .update({ brilho_foto: valor, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Erro ao salvar: ${error.message}` };
  } else {
    const { data: card } = await admin
      .from("videos_pais")
      .select("irmaos_dados")
      .eq("id", id)
      .single<Pick<VideoPais, "irmaos_dados">>();

    const irmaos = [...(card?.irmaos_dados ?? [])];
    if (!irmaos[indiceIrmao]) return { error: "Irmão não encontrado." };
    irmaos[indiceIrmao] = { ...irmaos[indiceIrmao], brilho: valor };

    const { error } = await admin
      .from("videos_pais")
      .update({ irmaos_dados: irmaos, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}

/**
 * Aplica o mesmo brilho em vários cards de uma vez.
 *
 * Fotos escuras costumam vir em lote — mesma sala, mesma luz, mesma
 * sessão de fotos. Ajustar uma a uma seria repetir o mesmo clique
 * dezenas de vezes.
 *
 * Dentro de cada card vale para TODAS as crianças: se a luz estava
 * ruim, estava ruim para os irmãos também. Depois dá pra afinar caso a
 * caso pelo botão da foto.
 */
export async function definirBrilhoEmLote(codigos: string[], brilho: number) {
  await exigirLogin();
  if (codigos.length === 0) return { error: "Nenhum card selecionado." };

  const valor = Math.min(250, Math.max(100, Math.round(brilho)));
  const admin = createAdminClient();

  const { data: cards, error: erroBusca } = await admin
    .from("videos_pais")
    .select("id, irmaos_dados")
    .in("codigo", codigos);

  if (erroBusca) return { error: `Erro ao buscar: ${erroBusca.message}` };

  let alterados = 0;
  for (const c of cards ?? []) {
    const irmaos = ((c.irmaos_dados ?? []) as Irmao[]).map((i) => ({
      ...i,
      brilho: valor,
    }));
    const { error } = await admin
      .from("videos_pais")
      .update({
        brilho_foto: valor,
        irmaos_dados: irmaos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (!error) alterados++;
  }

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true, alterados };
}

/** Tira um irmão do card. O card próprio dele NÃO volta sozinho. */
export async function removerIrmao(id: string, indice: number) {
  await exigirLogin();

  const admin = createAdminClient();
  const { data: card } = await admin
    .from("videos_pais")
    .select("irmaos_dados")
    .eq("id", id)
    .single<Pick<VideoPais, "irmaos_dados">>();

  const novos = (card?.irmaos_dados ?? []).filter((_, i) => i !== indice);

  const { error } = await admin
    .from("videos_pais")
    .update({ irmaos_dados: novos, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: `Erro ao remover irmão: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}

/**
 * Devolve uma URL assinada pro navegador subir o arquivo direto.
 * `upsert` ligado porque trocar a foto/vídeo é comum (saiu tremido,
 * gravou de novo) e o path é fixo por código.
 */
/**
 * @param indiceIrmao null = aluno principal; 0,1,2 = irmão naquela
 *   posição. O arquivo ganha sufixo (`-2`, `-3`) pra cada participante
 *   ter o seu, em vez de um sobrescrever o do outro.
 */
export async function criarUploadUrl(
  id: string,
  tipo: "video" | "foto",
  extensao: string,
  indiceIrmao: number | null = null,
) {
  await exigirLogin();

  const admin = createAdminClient();
  const { data: linha, error: erroLinha } = await admin
    .from("videos_pais")
    .select("codigo")
    .eq("id", id)
    .single();

  if (erroLinha || !linha) return { error: "Card não encontrado." };

  const ext = extensao.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
  const pasta = tipo === "video" ? "videos" : "fotos";
  const sufixo = indiceIrmao === null ? "" : `-${indiceIrmao + 2}`;
  const path = `${pasta}/${linha.codigo}${sufixo}.${ext || (tipo === "video" ? "mp4" : "jpg")}`;

  const { data, error } = await admin.storage
    .from(BUCKET_DIA_DOS_PAIS)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return { error: `Erro ao preparar upload: ${error?.message ?? "?"}` };
  }
  return { ok: true, path, token: data.token };
}

/** Grava o path no banco depois que o navegador confirmou o upload. */
export async function confirmarUpload(
  id: string,
  tipo: "video" | "foto",
  path: string,
  indiceIrmao: number | null = null,
) {
  await exigirLogin();

  const admin = createAdminClient();
  const campo = tipo === "video" ? "video_path" : "foto_path";

  if (indiceIrmao === null) {
    const { error } = await admin
      .from("videos_pais")
      .update({ [campo]: path, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Erro ao salvar: ${error.message}` };
  } else {
    // O irmão mora num jsonb, então precisa ler, alterar a posição e
    // gravar de volta.
    const { data: card } = await admin
      .from("videos_pais")
      .select("irmaos_dados")
      .eq("id", id)
      .single<Pick<VideoPais, "irmaos_dados">>();

    const irmaos = [...(card?.irmaos_dados ?? [])];
    if (!irmaos[indiceIrmao]) return { error: "Irmão não encontrado." };
    irmaos[indiceIrmao] = { ...irmaos[indiceIrmao], [campo]: path };

    const { error } = await admin
      .from("videos_pais")
      .update({ irmaos_dados: irmaos, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}

/**
 * Remove o card e os arquivos do Storage.
 *
 * Exige a senha de ações sensíveis — a mesma de excluir evento. É a
 * operação mais destrutiva do módulo: apaga o vídeo que a criança
 * gravou e, se o card já foi impresso, o QR daquele papel para de
 * funcionar para sempre.
 *
 * A senha é conferida AQUI, e não só na tela: validar no cliente
 * protegeria o botão, não a ação.
 */
export async function removerCard(id: string, senha: string) {
  await exigirLogin();

  const senhaCorreta = process.env.ADMIN_ACTION_PASSWORD || "Admim123";
  if (senha !== senhaCorreta) return { error: "Senha incorreta." };

  const admin = createAdminClient();
  const { data: linha } = await admin
    .from("videos_pais")
    .select("video_path, foto_path, irmaos_dados")
    .eq("id", id)
    .single<Pick<VideoPais, "video_path" | "foto_path" | "irmaos_dados">>();

  // Inclui os arquivos dos irmãos, senão eles ficariam órfãos no bucket.
  const paths = [
    linha?.video_path,
    linha?.foto_path,
    ...(linha?.irmaos_dados ?? []).flatMap((i) => [i.video_path, i.foto_path]),
  ].filter((p): p is string => !!p);
  if (paths.length) {
    await admin.storage.from(BUCKET_DIA_DOS_PAIS).remove(paths);
  }

  const { error } = await admin.from("videos_pais").delete().eq("id", id);
  if (error) return { error: `Erro ao remover: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}
