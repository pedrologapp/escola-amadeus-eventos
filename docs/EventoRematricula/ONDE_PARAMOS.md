# ONDE PARAMOS
Atualizado em 25/09/2026, antes de o Pedro reiniciar o Claude Code
para carregar a skill `design-system`.


====================================================================
A PRÓXIMA COISA A FAZER
====================================================================

1. USAR A SKILL `design-system` (é o motivo do reinício).
   Ela está instalada em `.claude/skills/design-system/` e só carrega em
   sessão nova. Pedir a ela um design system do Amadeus a partir da marca,
   e usar o resultado como base visual dos slides.

   O que já sei da identidade, e que serve de referência para ela:
       azul da marca     #083078   (extraído de public/folder/marca-30-anos.png)
       dourado da marca  #FFB000
       creme             #FAF7F0
       tipografia        pilha do sistema, sem webfont:
                         "SF Pro Display", "Segoe UI", system-ui,
                         -apple-system, Roboto, Helvetica, Arial, sans-serif
       serifa usada nos slides e no folder: Fraunces

   Contrastes já calculados (importantes, não recalcular na mão):
       #FFB000 sobre #FAF7F0 = 1,71:1   REPROVA, o dourado some no creme
       #FFB000 sobre #083078 = 6,73:1   passa
       #FFB000 sobre #08080C = 10,91:1  passa
       #083078 sobre #FAF7F0 = 11,52:1  passa
       #9BA4B8 sobre #FAF7F0 = 2,34:1   REPROVA (era usado, foi trocado)
       #5A6478 sobre #FAF7F0 = 5,56:1   passa, é o substituto

2. DECIDIR A DIREÇÃO VISUAL DOS SLIDES.
   Ficou pendente. Fiz o mesmo slide em três versões e o Pedro ainda não
   escolheu. O comparativo renderizado está no scratchpad da sessão antiga,
   mas dá para refazer em um minuto:

       A · foto       foto dos alunos ocupando a tela, texto por cima
       B · tipografia fundo quase preto, letra gigante, sem foto
       C · claro      fundo creme, serifa leve, muito respiro

   Minha recomendação foi a A, por dois motivos: a sala se reconhece nas
   próprias crianças, e a reunião é às 14h com luz de tarde no auditório.
   Projetor em sala clara lava o preto, então a B pode virar cinza sujo no
   telão. A foto sustenta melhor a luz ambiente.

3. REFAZER OS 20 SLIDES na direção escolhida.

4. DEPOIS: O DECK EM HTML, que é onde o Pedro quer chegar.
   Ele quer apresentar rolando a tela ("só ir abaixando"), com efeitos, e
   com os VÍDEOS dentro em algum momento. Ainda não definimos quais vídeos
   nem onde entram.

   O padrão já existe neste projeto: `app/folder/folder-cliente.tsx` usa
   seções de 100svh com scroll-snap e um vídeo dentro. É de lá que sai a
   receita. Rolagem resolve de vez o problema do formato, porque cada tela
   ocupa o que existir, seja quadrado ou 16:9.


====================================================================
O QUE JÁ ESTÁ PRONTO
====================================================================

SLIDES (200x200mm, quadrados, por causa da tela 2x2 do evento)

    Maria das Graças, abertura ..... 8 slides
    Gislene Sátiro, Infantil ....... 6 slides
    Adriana Alves, Fundamental ..... 6 slides

    docs/EventoRematricula/Slides_Reuniao_Completo.pptx   os 20, na ordem
    docs/EventoRematricula/Slides_*.pdf                    um por fala
    docs/EventoRematricula/slides/*.png                    3024x3024 cada
    docs/EventoRematricula/Slides_Texto_Para_Gamma.txt     só o texto

    Roteiros com a fala de cada slide:
       Slides_Graca_Abertura.md
       Slides_Gislene_Adriana.md

GERADORES

    scripts/gerar-slides-reuniao.mjs    monta os HTML dos slides
    scripts/exportar-slides-png.mjs     exporta PNG, um a um
    scripts/gerar-pptx-slides.mjs       monta os pptx
    scripts/gerar-fundo-slides.mjs      o fundo limpo, sem texto
    scripts/gerar-pptx-fundo.mjs        pptx vazio com o fundo no master
    scripts/gerar-flyer-fisico.mjs      o encarte impresso
    scripts/gerar-encarte-experiencia.mjs  o convite da Experiência

    >>> pptxgenjs e qrcode NÃO estão nas dependências do site. Rodam de uma
        pasta separada com npm i. Está anotado no cabeçalho dos scripts.

IMPRESSOS

    Flyer_Matriculas_2027.pdf           A4 frente e verso, bege
    Encarte_Experiencia_Amadeus.pdf     convite de 10/10, fundo escuro
    Encarte_Geekie_FrenteVerso.pdf      A4 deitado, sangrando

SITE

    /folder    o folder digital, no ar
    /geekie    a página do Geekie, no ar
    Painel /admin/reuniao com os materiais e links


====================================================================
DECISÕES QUE NÃO PODEM SER ESQUECIDAS
====================================================================

1. A tela do evento é 2x2, QUADRADA. Slides em 16:9 viram tarja com faixas
   pretas. Tudo foi feito em 1:1 por causa disso.

2. A Maria das Graças NÃO fala de valor, em nenhum momento. Preço é do
   fechamento da Sônia.

3. Ela agora CITA o nome "Geekie" no fim da fala dela. Foi decisão dela, e
   inverteu o que eu tinha proposto. Consequência: quem apresentar o Geekie
   depois precisa saber que o nome já foi dado, para não repetir a revelação.

4. O slide 2 da Graça ("como isso aqui começou") é o miolo da fala, 5 dos
   15 minutos. Ela conta a história da escola. Eu não escrevi esse conteúdo
   de propósito: são memórias da escola e inventar seria o pior erro aqui.

5. O cronograma no painel do admin NÃO tem o slot da abertura dela. Vai do
   trailer às 14h direto para o Geekie às 14h30. Precisa entrar.

6. Nunca arredondar os cantos de um QR code. Come a zona de silêncio e o
   leitor falha. Aconteceu e foi corrigido.

7. Preços do impresso vêm de lib/folder-config.ts, o mesmo arquivo do site,
   para papel e QR nunca divergirem.


====================================================================
PENDÊNCIAS COM TERCEIROS
====================================================================

  - As três mudanças / a história que a Maria das Graças vai contar
  - Quantas famílias estão há mais de dez anos na escola (não sai do banco:
    a tabela de alunos não guarda data de matrícula)
  - Confirmar com a Geekie se os tablets que a escola vai comprar rodam a
    plataforma: a documentação deles diz que o app NÃO roda em tablet
  - Confirmar que o Relatório Família Conectada foi contratado e que os
    responsáveis serão cadastrados
  - Fotos reais do Amadeus para trocar as duas de banco de imagem
    (socioemocional e educação financeira)
  - Aprovação das descrições dos quatro esportes, que foram escritas por mim
  - Valores do fardamento 2027, se forem entrar no encarte
