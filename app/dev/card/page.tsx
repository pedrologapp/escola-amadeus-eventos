import { notFound } from "next/navigation";
import QRCode from "qrcode";
import {
  CardImpresso,
  cssCard,
  dimensoes,
  type Formato,
} from "@/components/dia-dos-pais/card-impresso";

/**
 * Prévia do card impresso — SÓ EM DESENVOLVIMENTO.
 *
 * A folha de verdade fica atrás do login do admin, o que torna cada
 * ajuste de layout uma sessão de login. Esta rota mostra o mesmo
 * componente com dados de exemplo, sem tocar no banco.
 *
 * Em produção responde 404: não expõe nome de aluno nem foto.
 */
export const dynamic = "force-dynamic";

/**
 * Retrato de mentira, desenhado em SVG na hora. Evita despejar fotos de
 * exemplo em `public/`, que iriam parar em produção sem servir pra nada.
 */
function retratoFalso(iniciais: string, cor: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="400" height="400" fill="${cor}"/>
    <circle cx="200" cy="155" r="68" fill="#f5ded0"/>
    <ellipse cx="200" cy="360" rx="108" ry="105" fill="#f5ded0"/>
    <text x="200" y="170" font-family="Segoe UI, sans-serif" font-size="54"
      font-weight="700" fill="#54453c" text-anchor="middle">${iniciais}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const EXEMPLOS = [
  { id: "1", codigo: "k7m2xq", aluno_nome: "Maria Clara", serie: "Grupo V", turma: "A" },
  {
    id: "2",
    codigo: "9np3gz",
    aluno_nome: "Abner Gabriel Tomaz da Silva Araújo",
    serie: "1º Ano",
    turma: "B",
  },
  { id: "3", codigo: "z79nyy", aluno_nome: "João Pedro Nascimento", serie: "5º Ano", turma: "A" },
  { id: "4", codigo: "cnd9v2", aluno_nome: "Ana Beatriz Lima", serie: "9º Ano", turma: "B" },
];

export default async function PreviaCardPage({
  searchParams,
}: {
  searchParams: Promise<{ formato?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { formato } = await searchParams;
  const f: Formato =
    formato === "a4" || formato === "legal" ? formato : "oficio";
  const dim = dimensoes(f);

  const qrs = await Promise.all(
    EXEMPLOS.map((e) =>
      QRCode.toString(`https://escolaamadeus.com/p/${e.codigo}`, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 0,
        color: { dark: "#063376", light: "#ffffff" },
      }),
    ),
  );

  return (
    <>
      <style>{`
        body { background: #e8e8ea; }
        .tira {
          display: flex; gap: 18px; padding: 24px; flex-wrap: wrap;
          justify-content: center; align-items: flex-start;
        }
        .card { box-shadow: 0 6px 28px rgba(0,0,0,.28); }
        .medida {
          font: 600 12px system-ui, sans-serif; color: #555;
          text-align: center; padding: 16px 0 0;
        }
      `}</style>
      <style>{cssCard(dim)}</style>

      <p className="medida">
        Prévia · card {dim.cardW}×{dim.cardH}mm ({dim.rotulo}) · sem foto no
        primeiro pra ver o estado vazio
      </p>
      <div className="tira">
        {EXEMPLOS.map((e, i) => (
          <CardImpresso
            key={e.id}
            aluno={e}
            // O primeiro sai sem foto de propósito: é o estado que a
            // escola vê se alguma criança faltar no dia.
            fotoUrl={
              i === 0
                ? undefined
                : retratoFalso(
                    e.aluno_nome
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join(""),
                    ["#8a6f4e", "#5f8f77", "#a96f92", "#6d88bd"][i],
                  )
            }
            qrSvg={qrs[i]}
          />
        ))}
      </div>
    </>
  );
}
