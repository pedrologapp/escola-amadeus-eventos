// Opções do formulário de fardamento (usadas no form e no relatório).

export const MODELOS = [
  { valor: "masculino", label: "Masculino" },
  { valor: "feminino", label: "Feminino" },
] as const;

export const TAMANHOS = ["P", "M", "G", "GG"] as const;

export const TIPOS = [
  { valor: "normal", label: "Normal" },
  { valor: "babylook", label: "Baby look" },
] as const;

export function labelModelo(v: string | null | undefined): string {
  return MODELOS.find((m) => m.valor === v)?.label ?? "—";
}
export function labelTipo(v: string | null | undefined): string {
  return TIPOS.find((t) => t.valor === v)?.label ?? "—";
}
