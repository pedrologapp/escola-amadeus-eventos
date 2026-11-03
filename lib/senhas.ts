import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Senhas e segredos do servidor num lugar só (03/11/2026). Antes cada arquivo tinha uma senha de reserva escrita no
 * código ("Admim123", "admin123", "amadeus-*-fallback"), que passava a valer quando a variável faltava — e na Vercel
 * ela faltava. Agora, sem a variável, ninguém entra: a tela avisa que a senha não está configurada.
 */

/** Compara sem vazar pelo tempo de resposta quantas letras estavam certas. */
export function iguais(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

/** A senha das ações sensíveis, da portaria e dos valores (ADMIN_ACTION_PASSWORD). Sem a variável, nada passa. */
export function senhaAcaoValida(senha: string): boolean {
  const esperada = process.env.ADMIN_ACTION_PASSWORD;
  if (!esperada) return false;
  return iguais(senha, esperada);
}

/** Avisa na tela quando o problema é a falta da variável, e não uma senha errada. */
export const SENHA_NAO_CONFIGURADA = "A senha ainda não foi configurada no servidor. Peça ao Pedro para cadastrá-la na Vercel.";
export const senhaAcaoConfigurada = () => Boolean(process.env.ADMIN_ACTION_PASSWORD);

/** Segredo que assina os cookies de portaria, relatório e valores. Sem ele o cookie não é aceito. */
export function segredoDosCookies(): string {
  const s = process.env.WEBHOOK_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("WEBHOOK_CONFIRM_SECRET não configurado no servidor.");
  return s;
}
