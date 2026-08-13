/**
 * O card impresso do Dia dos Pais — 1/4 de folha, para a placa de acrílico.
 *
 * Fica num componente próprio (e não dentro da página) por dois motivos:
 * a página de impressão exige login, e a prévia de desenvolvimento não;
 * e porque as medidas em milímetro merecem um lugar só delas.
 *
 * Tudo aqui é dimensionado em mm a partir do tamanho do card, então os
 * três formatos de papel saem com as mesmas proporções.
 */

/**
 * O card é sempre exatamente 1/4 da folha (metade da largura × metade
 * da altura). Assim, imprimindo no MESMO papel que deu origem à placa
 * de acrílico, o quadrante bate por construção.
 *
 *  - oficio: folha 216×330mm → card 108 × 165mm   (padrão)
 *  - legal:  folha 216×356mm → card 108 × 178mm
 *  - a4:     folha 210×297mm → card 105 × 148,5mm
 */
export const FORMATOS = {
  oficio: { folhaW: 216, folhaH: 330, papel: "216mm 330mm", rotulo: "Ofício 216×330" },
  legal: { folhaW: 216, folhaH: 356, papel: "216mm 356mm", rotulo: "Legal 216×356" },
  a4: { folhaW: 210, folhaH: 297, papel: "A4 portrait", rotulo: "A4 210×297" },
} as const;

export type Formato = keyof typeof FORMATOS;

/** O quadrante: metade da folha em cada eixo. */
export function dimensoes(f: Formato) {
  const base = FORMATOS[f];
  return { ...base, cardW: base.folhaW / 2, cardH: base.folhaH / 2 };
}

export type Dim = ReturnType<typeof dimensoes>;

/**
 * Palatino Linotype. O PDF é gerado na máquina da escola (Windows), onde
 * a fonte real está instalada e é a que vai pro papel; as seguintes são
 * o equivalente de cada plataforma, só pra conferir na tela.
 */
export const SERIF = `"Palatino Linotype", "Book Antiqua", Palatino, "URW Palladio L", Georgia, serif`;

export interface DadosCard {
  id: string;
  codigo: string;
  aluno_nome: string;
  /** Irmãos que dividem este card e este vídeo. Vazio = um aluno só. */
  irmaos?: string[];
  serie: string | null;
  turma: string | null;
}

/**
 * "Maria e João" para dois irmãos, "Maria, João e Ana" para três.
 * O pai com mais de um filho leva UM card, então os nomes entram juntos.
 */
function nomesDoCard(aluno: DadosCard) {
  const todos = [aluno.aluno_nome, ...(aluno.irmaos ?? [])].filter(Boolean);
  if (todos.length === 1) return todos[0];
  return `${todos.slice(0, -1).join(", ")} e ${todos[todos.length - 1]}`;
}

/**
 * O nome é o único conteúdo de tamanho imprevisível do card: vai de
 * "Ana Lima" a "Adrian Emanuel Gurgel de Oliveira dos Santos". Em corpo
 * fixo, o nome longo quebra em três linhas e empurra o rodapé pra fora
 * da moldura. Escalonar o corpo mantém o card fechado em qualquer nome,
 * e ainda deixa o nome curto com a imponência que ele merece.
 */
function classeDoNome(nome: string) {
  if (nome.length > 32) return "aluno-nome nome-longo";
  if (nome.length > 22) return "aluno-nome nome-medio";
  return "aluno-nome";
}

export function CardImpresso({
  aluno,
  fotoUrl,
  qrSvg,
}: {
  aluno: DadosCard;
  fotoUrl?: string;
  qrSvg: string;
}) {
  // Série e turma não aparecem no card: quem recebe é o pai, e o que
  // importa pra ele é o nome do filho. A escola usa esses campos só pra
  // ordenar e separar as folhas na hora de imprimir.
  const nomes = nomesDoCard(aluno);

  return (
    <article className="card">
      {/* Moldura de convite: filete fino + cantos marcados */}
      <div className="moldura" aria-hidden>
        <i className="canto tl" />
        <i className="canto tr" />
        <i className="canto bl" />
        <i className="canto br" />
      </div>

      <div className="conteudo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dia-dos-pais-titulo.png"
          alt="Feliz Dia dos Pais"
          className="titulo-arte"
        />

        <div className="retrato">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt={nomes} className="foto" />
          ) : (
            <div className="foto foto-vazia">sem foto</div>
          )}
        </div>

        <p className="rotulo">Um recado de</p>
        <p className={classeDoNome(nomes)}>{nomes}</p>

        {/* QR sempre em caixa branca: contraste é o que faz a câmera ler
            de primeira, ainda mais sob luz fraca. */}
        <div className="qr-caixa">
          <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <p className="instrucao">
          Aponte a câmera do celular
          <br />
          <strong>
            e veja o recado {aluno.irmaos?.length ? "dos seus filhos" : "do seu filho"}
          </strong>
        </p>

        {/* Frase em lettering + o pai abraçando o filho ao lado. Ambas
            as artes têm transparência, então assentam no azul do card
            sem moldura nenhuma. */}
        <div className="bloco-frase">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dia-dos-pais-frase.png"
            alt="Todo filho guarda um pouco do pai no adulto em quem se torna."
            className="frase-arte"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dia-dos-pais-ilustracao.png" alt="" className="ilustracao" />
        </div>

        <footer className="card-rodape">
          {/* Versão negativa da logo: fundo transparente e "AMADEUS" em
              branco. O lockup original tem texto azul-marinho, que sumiria
              no azul do card, e um selo branco atrás sujaria a peça. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-amadeus-negativa.png"
            alt="Centro Educacional Amadeus"
            className="logo-escola"
          />
        </footer>
      </div>
    </article>
  );
}

/**
 * CSS em string (não Tailwind) porque aqui a unidade é milímetro e o
 * alvo é papel. Cores da arte oficial: azul #063376, dourado #f2b014.
 *
 * As alturas somam ~97% da altura útil do card; o rodapé leva
 * `margin-top:auto` pra absorver a folga e os nomes de 2–3 linhas.
 */
export function cssCard(d: Dim) {
  const util = d.cardH - 16; // menos os paddings verticais do conteúdo
  return `
  .card {
    position: relative;
    width: ${d.cardW}mm; height: ${d.cardH}mm;
    box-sizing: border-box;
    color: #fff; font-family: ${SERIF};
    background: #063376;
    /* Brilho quente atrás da logo. Só é seguro porque a arte tem
       transparência real — com mix-blend o dourado virava rosa. */
    background-image:
      radial-gradient(78% 42% at 50% 2%, rgba(242,176,20,.20) 0%, transparent 68%),
      radial-gradient(120% 60% at 50% 100%, rgba(0,0,0,.28) 0%, transparent 60%);
    overflow: hidden;
  }

  /* ---- Moldura ---- */
  .moldura {
    position: absolute; inset: ${d.cardW * 0.042}mm;
    border: .22mm solid rgba(242,176,20,.42);
  }
  .canto { position: absolute; width: 4.5mm; height: 4.5mm; }
  .canto.tl { top: -.9mm; left: -.9mm; border-top: .5mm solid #f2b014; border-left: .5mm solid #f2b014; }
  .canto.tr { top: -.9mm; right: -.9mm; border-top: .5mm solid #f2b014; border-right: .5mm solid #f2b014; }
  .canto.bl { bottom: -.9mm; left: -.9mm; border-bottom: .5mm solid #f2b014; border-left: .5mm solid #f2b014; }
  .canto.br { bottom: -.9mm; right: -.9mm; border-bottom: .5mm solid #f2b014; border-right: .5mm solid #f2b014; }

  /* ---- Conteúdo ---- */
  .conteudo {
    position: relative; height: 100%; box-sizing: border-box;
    padding: ${util * 0.045}mm ${d.cardW * 0.105}mm ${util * 0.05}mm;
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
  }

  /* Alturas somadas: ~147mm num card de 165mm, deixando ~6mm de folga
     pra nomes que quebram em 3 linhas. Mexer nestes fatores sem refazer
     a conta faz o rodapé sair cortado. */
  .titulo-arte { width: ${d.cardW * 0.27}mm; height: auto; display: block; }

  /* ---- Retrato ----
     Maior que o QR de propósito: quem tem que dominar o card é a
     criança, não o código. */
  .retrato {
    margin-top: ${util * 0.015}mm;
    padding: .8mm; border-radius: 50%;
    border: .22mm solid rgba(242,176,20,.5);   /* anel externo fino */
  }
  .foto {
    display: block; width: ${util * 0.16}mm; height: ${util * 0.16}mm;
    object-fit: cover; border-radius: 50%;
    border: .7mm solid #f2b014;                 /* anel interno cheio */
  }
  .foto-vazia {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.1); color: rgba(255,255,255,.45);
    font-size: 6.5pt; border-color: rgba(242,176,20,.45);
  }

  /* ---- Tipografia ---- */
  /* Em caixa alta, dourado e com peso: antes era cinza-claro e miúdo,
     e sumia contra o azul. O respiro maior separa da foto. */
  .rotulo {
    margin: ${util * 0.024}mm 0 0; font-size: 6.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: .3em;
    color: #f2b014;
  }
  .aluno-nome {
    /* Palatino não tem peso 800 — acima de 700 o navegador engorda a
       letra artificialmente e ela perde o desenho. */
    margin: ${util * 0.01}mm 0 0; font-size: 14pt; font-weight: 700;
    line-height: 1.14; max-width: ${d.cardW * 0.82}mm;
  }
  .aluno-nome.nome-medio { font-size: 12pt; }
  .aluno-nome.nome-longo { font-size: 10.5pt; line-height: 1.2; }
  /* Branco suave: o dourado agora é do rótulo acima, e dois dourados
     seguidos brigavam entre si. */
  .aluno-turma {
    margin: ${util * 0.01}mm 0 0; font-size: 8pt; font-style: italic;
    color: rgba(255,255,255,.75);
  }

  /* O ornamento de losango saiu: com a arte da frase colorida no rodapé,
     ele virava ruído — e os ~6mm que ocupava foram pro lettering. */

  /* ---- QR ----
     14% da altura útil ≈ 21mm num card de ofício. Com a URL curta o QR
     sai em 29×29 módulos, ou seja ~0,7mm por módulo — bem acima do que
     a câmera de celular precisa, e sobra espaço pra foto ser o destaque. */
  .qr-caixa {
    margin-top: ${util * 0.02}mm; padding: 1.8mm;
    background: #fff; border-radius: 1.2mm;
    box-shadow: 0 .6mm 1.6mm rgba(0,0,0,.3);
  }
  .qr { width: ${util * 0.115}mm; height: ${util * 0.115}mm; }
  .qr svg { width: 100%; height: 100%; display: block; }

  /* Corpo e opacidade subiram: a 6–7pt translúcido, o texto imprimia
     acinzentado e quase não se lia no azul. */
  .instrucao {
    margin: ${util * 0.02}mm 0 0; font-size: 8pt; line-height: 1.4;
    color: #fff;
  }
  .instrucao strong { color: #f2b014; font-weight: 700; }

  /* A frase e a ilustração dividem uma faixa: o lettering é largo e
     baixo, a criança é alta e estreita — juntos ocupam a mesma altura
     que a frase em texto ocupava, sem roubar espaço do QR. */
  .bloco-frase {
    margin-top: ${util * 0.022}mm;
    display: flex; align-items: flex-end; justify-content: center;
    gap: 1.5mm; width: 100%;
  }
  .frase-arte { width: ${d.cardW * 0.42}mm; height: auto; display: block; }
  .ilustracao { width: ${d.cardW * 0.15}mm; height: auto; display: block; }

  /* ---- Rodapé ---- */
  .card-rodape {
    margin-top: auto; padding-top: ${util * 0.018}mm;
    display: flex; justify-content: center;
  }
  /* A logo é horizontal (≈4:1), então largura generosa custa pouca
     altura — cabe bem no rodapé sem apertar o resto. */
  .card-rodape .logo-escola {
    width: ${d.cardW * 0.62}mm; height: auto; display: block;
  }
`;
}
