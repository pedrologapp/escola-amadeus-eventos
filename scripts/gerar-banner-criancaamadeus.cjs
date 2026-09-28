const fs=require("fs"),path=require("path");
const raiz=process.cwd(), S=process.argv[2];
const src=fs.readFileSync("app/criancaamadeus/desenho.tsx","utf8");
const consts={}; for(const m of src.matchAll(/^const (\w+) = "([^"]+)";/gm)) consts[m[1]]=m[2];
let bloco=src.slice(src.indexOf("const TRACOS: Traco[] = [")+"const TRACOS: Traco[] = ".length, src.indexOf("];\n\nexport")+1);
const TRACOS=new Function(...Object.keys(consts),"return "+bloco)(...Object.values(consts));
const paths=TRACOS.map(t=>`<path d="${t.d}" stroke="${t.cor}" stroke-width="${t.w??5}" fill="${t.fill??"none"}"/>`).join("");
const svg=(w)=>`<svg viewBox="0 0 720 350" width="${w}"><defs><filter id="giz" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs><g filter="url(#giz)" fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
const logo="file:///"+path.join(raiz,"public/folder/marca-30-anos.png").split(path.sep).join("/");
const head=`<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=DM+Sans:wght@400;600;800&display=swap" rel="stylesheet"><style>*{margin:0;box-sizing:border-box}body{background:#FAF7F0;font-family:'DM Sans',sans-serif;color:#17223D}.t{font-family:Caveat;color:#1B3B7C;font-weight:700;line-height:1}.eb{font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#B9862F}.pill{display:inline-block;background:#FFB000;color:#083078;font-weight:800;border-radius:999px}</style>`;
fs.writeFileSync(path.join(S,"banner-quadrado.html"),`<html><head>${head}</head><body><div style="width:1080px;height:1080px;padding:64px 70px;display:flex;flex-direction:column;align-items:center;position:relative">
<img src="${logo}" style="position:absolute;left:70px;top:56px;width:120px">
<p class="eb" style="margin-top:34px;font-size:22px;align-self:flex-end">Equipe Amadeus</p>
<div style="margin-top:30px">${svg(880)}</div>
<h1 class="t" style="font-size:100px;margin-top:18px;white-space:nowrap">Como é bom ser criança...!</h1>
<p style="font-size:34px;line-height:1.4;text-align:center;margin-top:24px;color:#5A6478;max-width:820px">Selecione o seu nome e envie uma <b style="color:#17223D">foto sua de quando era criança</b>.</p>
<p class="pill" style="font-size:30px;padding:16px 36px;margin-top:32px">eventos.escolaamadeus.com/criancaamadeus</p>
</div></body></html>`);
fs.writeFileSync(path.join(S,"banner-og.html"),`<html><head>${head}</head><body><div style="width:1200px;height:630px;padding:44px 60px;display:flex;flex-direction:column;align-items:center;position:relative">
<img src="${logo}" style="position:absolute;left:56px;top:36px;width:92px">
<div style="margin-top:6px">${svg(820)}</div>
<h1 class="t" style="font-size:96px;margin-top:10px">Como é bom ser criança...!</h1>
<p style="font-size:28px;margin-top:18px;color:#5A6478">Envie uma foto sua de quando era criança</p>
</div></body></html>`);
console.log(TRACOS.length,"traços");
