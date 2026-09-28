const sharp=require("sharp"),fs=require("fs"),path=require("path");
const K="C:/Users/pedro/Downloads/AMADEUS _ Branding-20251009T142316Z-1-001/AMADEUS _ Branding/PNG";
const usados=[1,6,8,10,11,12,13,14,15,17,18,19,21,22,23,25,26,27,28,29,30,31,33,35,36,37,38,39,40,41,42];
const out="public/marca/pecas";fs.mkdirSync(out,{recursive:true});
(async()=>{const meta={};let tot={p:0,g:0};
for(const n of usados){const src=path.join(K,`Ativo ${n}@6000x.png`);const m=await sharp(src).metadata();
 const trim=await sharp(src).trim().toBuffer({resolveWithObject:true});const w=trim.info.width,h=trim.info.height;
 meta[n]=Math.round(w/h*10000)/10000;
 const p=await sharp(trim.data).resize({width:w>=h?1000:null,height:h>w?1000:null}).webp({quality:85}).toFile(`${out}/ativo-${n}.webp`);
 const g=await sharp(trim.data).resize({width:w>=h?4000:null,height:h>w?4000:null,withoutEnlargement:true}).webp({quality:88}).toFile(`${out}/ativo-${n}-hd.webp`);
 tot.p+=p.size;tot.g+=g.size;console.log(n,m.width+"x"+m.height,"→ trim",w+"x"+h,Math.round(p.size/1024)+"KB",Math.round(g.size/1024)+"KB");}
fs.writeFileSync(`${out}/proporcoes.json`,JSON.stringify(meta));console.log("total prévia",Math.round(tot.p/1024)+"KB","hd",Math.round(tot.g/1024/1024)+"MB");})();
