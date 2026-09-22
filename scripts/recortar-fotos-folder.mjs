import sharp from "sharp";
import { mkdirSync } from "node:fs";

/**
 * Os cards do Instagram têm o texto gravado na imagem. Aqui eu recorto só a
 * região da foto de cada um, pra que o folder use a imagem limpa e escreva o
 * texto por cima com a tipografia do site.
 *
 * Todos os originais são 1080x1440.
 */
const RAIZ =
  "C:/Users/pedro/OneDrive/Área de Trabalho/Meu Futuro/Agência IA/EscolaAmadeus/Sistema";
const ENTRADA = `${RAIZ}/docs/EventoRematricula/pogramas`;
const SAIDA = `${RAIZ}/public/folder/programas`;

const recortes = [
  {
    arquivo: "SaveClip.App_653523127_18454944811103095_8520456171771735163_n.jpg",
    nome: "arboria",
    caixa: { left: 78, top: 165, width: 912, height: 690 },
  },
  {
    arquivo: "SaveClip.App_654336318_18454944790103095_639821032980264096_n.jpg",
    nome: "socioemocional",
    caixa: { left: 715, top: 400, width: 365, height: 720 },
  },
  {
    arquivo: "SaveClip.App_654423079_18454944835103095_379344884110098167_n.jpg",
    nome: "esportes",
    caixa: { left: 430, top: 255, width: 490, height: 490 },
  },
  {
    arquivo: "SaveClip.App_655005256_18454944808103095_5750178374497478486_n.jpg",
    nome: "robotica",
    caixa: { left: 30, top: 570, width: 640, height: 700 },
  },
  {
    arquivo: "SaveClip.App_655062154_18454944820103095_5556885771565569845_n.jpg",
    nome: "financeira",
    caixa: { left: 570, top: 120, width: 510, height: 420 },
  },
  {
    arquivo: "SaveClip.App_655347532_18454944781103095_712582896044254013_n.jpg",
    nome: "bilingue",
    caixa: { left: 205, top: 115, width: 600, height: 690 },
  },
];

mkdirSync(SAIDA, { recursive: true });

for (const r of recortes) {
  const destino = `${SAIDA}/${r.nome}.webp`;
  await sharp(`${ENTRADA}/${r.arquivo}`)
    .extract(r.caixa)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destino);
  const m = await sharp(destino).metadata();
  console.log(r.nome.padEnd(16), m.width + "x" + m.height);
}
