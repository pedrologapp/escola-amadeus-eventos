import { createAdminClient } from "@/lib/supabase/admin";
import { ENQUETE_ALUNOS, ENQUETE_PAIS, type EnqueteDef } from "@/lib/enquete-config";
import {
  EnqueteAdminTabs,
  type AbaEnquete,
} from "@/components/enquete/enquete-admin-tabs";
import type { RespostaRow } from "@/components/enquete/enquete-dashboard";

const ABAS: { chave: string; rotulo: string; def: EnqueteDef }[] = [
  { chave: "alunos", rotulo: "Alunos (Fund. 2)", def: ENQUETE_ALUNOS },
  { chave: "pais", rotulo: "Famílias (Fund. 1)", def: ENQUETE_PAIS },
];

export default async function AdminEnquetePage() {
  const admin = createAdminClient();

  const abas: AbaEnquete[] = await Promise.all(
    ABAS.map(async ({ chave, rotulo, def }) => {
      const { data } = await admin
        .from("enquete_respostas")
        .select("id, serie, turma, respostas, meta, created_at")
        .eq("slug", def.slug)
        .order("created_at", { ascending: false });
      const shareUrl =
        (def.shareUrlEnv && process.env[def.shareUrlEnv]) || def.shareUrlDefault;
      return {
        chave,
        rotulo,
        def,
        respostas: (data ?? []) as RespostaRow[],
        shareUrl,
      };
    }),
  );

  return <EnqueteAdminTabs abas={abas} />;
}
