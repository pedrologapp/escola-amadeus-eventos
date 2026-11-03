import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Confere o login dentro da própria server action (03/11/2026). Estar em app/admin/(authed) e passar pelo proxy
 * protege a página, não a action: ela pode ser chamada direto. Toda action que usa a service role
 * (createAdminClient) e não tem segredo próprio começa por aqui.
 */
export async function usuarioLogado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
