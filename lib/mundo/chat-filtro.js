// Cópia do filtro do chat do jogo (Arboria/Mundo/jogo/src/chat-filtro.js): o mesmo filtro roda no tablet e aqui no servidor.
// Filtro do chat de Arboria (Pedro, 24/10/2026): bloqueia ANTES de enviar palavrões, ofensas e dados pessoais (telefone,
// e-mail, @ de redes sociais, endereço, links). Sem dependências: o jogo e o servidor (Parte 2) usam o mesmo arquivo.
// filtrar(texto) -> { ok: true, texto } ou { ok: false, motivo, aviso }
export const LIMITE_CARACTERES = 80;

// letras trocadas por números/símbolos ("p0rr4", "f*d@") e letras repetidas ("porrrra") voltam ao normal antes de comparar
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
function normal(s) { return semAcento(s.toLowerCase()).replace(/[0134578@$!|]/g, (c) => LEET[c] || c).replace(/(.)\1{2,}/g, '$1$1'); }
const juntar = (s) => s.replace(/[^a-z]/g, '');   // "p.u.t.a", "p u t a"

// palavras que bloqueiam sozinhas (palavra inteira, ou escondidas com pontos/espaços entre as letras)
const PALAVROES = ['porra', 'caralho', 'karalho', 'merda', 'bosta', 'puta', 'puto', 'putaria', 'foda', 'fodase', 'foder', 'fuder', 'fudido', 'fodido', 'buceta', 'boceta',
  'piroca', 'cacete', 'arrombado', 'arrombada', 'cuzao', 'cuzinho', 'desgraca', 'desgracado', 'desgracada', 'vagabundo', 'vagabunda', 'piranha',
  'safado', 'safada', 'corno', 'xereca', 'xoxota', 'punheta', 'siririca', 'bct', 'pqp', 'fdp', 'vsf', 'vtnc', 'tnc', 'krl', 'crl', 'prr', 'cu', 'kct', 'fds'];
const OFENSAS = ['viado', 'viadinho', 'bicha', 'sapatao', 'retardado', 'retardada', 'mongol', 'mongoloide', 'idiota', 'imbecil', 'otario', 'otaria', 'babaca', 'debil',
  'escroto', 'escrota', 'nojento', 'nojenta', 'lixo', 'macaco', 'macaca', 'baleia', 'aleijado', 'cala a boca', 'calaboca', 'te odeio', 'vou te bater', 'vai morrer', 'se mata'];
// ofensas que só contam dirigidas a alguém ("seu burro", "você é feio"), para não bloquear "o burro do sítio"
const OFENSA_DIRIGIDA = ['burro', 'burra', 'feio', 'feia', 'gordo', 'gorda', 'chato', 'chata', 'besta', 'tonto', 'tonta', 'ridiculo', 'ridicula', 'inutil', 'fracassado', 'fracassada'];
const DIRIGIDA = /\b(seu|sua|voce e|vc e|tu e|vcs sao|voces sao|que)\s+(\w+\s+)?/;

const re = (lista) => new RegExp('\\b(' + lista.map((p) => p.replace(/ /g, '\\s+')).join('|') + ')\\b');
const RE_PALAVRAO = re(PALAVROES), RE_OFENSA = re(OFENSAS), RE_DIRIGIDA = new RegExp(DIRIGIDA.source + '(' + OFENSA_DIRIGIDA.join('|') + ')\\b');
const ESCONDIDAS = PALAVROES.concat(OFENSAS).filter((p) => p.length >= 4 && !p.includes(' '));   // "p.u.t.a" / "i d i o t a"

const AVISO = {
  palavrao: 'Não enviada: tem uma palavra que não pode aqui.',
  ofensa: 'Não enviada: isso pode magoar alguém. Que tal escrever de outro jeito?',
  telefone: 'Não enviada: parece um número de telefone. Em Arboria a gente não compartilha dados pessoais.',
  email: 'Não enviada: parece um e-mail. Em Arboria a gente não compartilha dados pessoais.',
  rede: 'Não enviada: parece um perfil de rede social. Em Arboria a gente não compartilha dados pessoais.',
  endereco: 'Não enviada: parece um endereço. Em Arboria a gente não compartilha dados pessoais.',
  link: 'Não enviada: links não podem ser enviados no chat.',
  vazia: 'Escreva alguma coisa antes de enviar.',
  longa: `Até ${LIMITE_CARACTERES} letras por mensagem.`,
};
export const MOTIVOS = { palavrao: 'palavrão', ofensa: 'ofensa', telefone: 'telefone', email: 'e-mail', rede: 'rede social', endereco: 'endereço', link: 'link' };

export function filtrar(bruto) {
  const texto = String(bruto ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return { ok: false, motivo: 'vazia', aviso: AVISO.vazia };
  if (texto.length > LIMITE_CARACTERES) return { ok: false, motivo: 'longa', aviso: AVISO.longa };
  const n = normal(texto), baixo = semAcento(texto.toLowerCase());
  const motivo = dadosPessoais(texto, baixo) || (RE_PALAVRAO.test(n) && 'palavrao') || ((RE_OFENSA.test(n) || RE_DIRIGIDA.test(n)) && 'ofensa') || escondida(n);
  return motivo ? { ok: false, motivo, aviso: AVISO[motivo] } : { ok: true, texto };
}
function escondida(n) {
  // letras soltas separadas por pontos/espaços/traços: "p u t a", "i.d.i.o.t.a" (só quando há separadores entre letras)
  for (const m of n.matchAll(/\b(?:[a-z][\s.\-_*]+){3,}[a-z]\b/g)) { const j = juntar(m[0]); if (ESCONDIDAS.some((p) => j.includes(p))) return PALAVROES.some((p) => j.includes(p)) ? 'palavrao' : 'ofensa'; }
  return null;
}
function dadosPessoais(t, b) {
  if (/(^|\s)@[\w.]{2,}/.test(b)) return 'rede';   // "@perfil" (antes do e-mail: "insta é @fulano.silva" não é e-mail)
  if (/[\w.+-]+\s*(@|\(at\)|arroba)\s*[\w-]+\s*(\.|ponto)\s*[a-z]{2,}/i.test(b)) return 'email';
  if (/\b(https?|www)\b|\.(com|br|net|org|gg|io|me|tv)\b|\b(bit\.ly|discord\.gg)\b/.test(b)) return 'link';
  // 8 ou mais algarismos seguidos, mesmo com espaços, pontos, traços ou parênteses no meio (telefone, CPF)
  const digitos = b.replace(/[\s.\-()/]/g, ''); if (/\d{8,}/.test(digitos) || /(\d[\s.\-()]*){8,}/.test(b)) return 'telefone';
  if (/\b(zap|whats|whatsapp|wpp|zapzap|telefone|celular|cel|numero|fone)\b/.test(b) && /\d{4,}/.test(digitos)) return 'telefone';
  if (/\b(insta|instagram|tiktok|tik tok|discord|telegram|snap|snapchat|kwai|facebook|face|twitter|youtube|canal)\b/.test(b) && /\b(meu|minha|me chama|me segue|segue|add|adiciona|chama|procura|e)\b/.test(b)) return 'rede';
  if (/\b(moro|mora|meu endereco|endereco|cep)\b/.test(b) && (/\d{2,}/.test(b) || /\b(rua|avenida|av|travessa|bairro|condominio|bloco|apto|apartamento|casa \d)\b/.test(b))) return 'endereco';
  if (/\b(rua|avenida|av|travessa|alameda|rodovia|condominio)\b\s+[\w\s]{2,30}\s+\d{1,5}\b/.test(b)) return 'endereco';
  return null;
}
