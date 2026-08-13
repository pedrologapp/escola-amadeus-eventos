"use client";

/**
 * Só chama window.print(). Existe como client component isolado pra
 * página de impressão continuar sendo um server component (ela precisa
 * disso pra assinar as URLs do bucket privado no servidor).
 */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        marginLeft: "auto",
        padding: "8px 18px",
        borderRadius: 10,
        border: "none",
        background: "#f5a623",
        color: "#1b3b7c",
        font: "700 14px system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      Imprimir / Salvar PDF
    </button>
  );
}
