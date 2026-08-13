# Dia dos Pais — vídeos dos alunos

Cada aluno grava um vídeo. O pai recebe um card impresso (1/4 de folha,
tamanho da placa de acrílico) com a foto da criança e um QR. Ele aponta a
câmera e vê o vídeo. O link é permanente — ele leva pra casa e guarda.

## Como funciona por baixo

O QR **não** aponta pro arquivo do vídeo. Ele aponta pra uma página nossa:

```
escolaamadeus.com/p/k7m2xq
```

Isso é o que torna o papel permanente: se um dia o vídeo mudar de lugar,
troca-se o caminho no banco e **todos os cards já entregues continuam
funcionando**. Se o QR apontasse direto pro arquivo, o papel viraria lixo
no dia que o link mudasse.

Os vídeos ficam num bucket **privado** do Supabase (`dia-dos-pais`). São
crianças — nada fica com URL pública permanente. A página gera um link
temporário a cada visita.

---

## Passo a passo

### 0. Banco — já pronto

Migration `0019` aplicada e bucket privado `dia-dos-pais` criado em
13/08/2026. Nada a fazer aqui.

### 1. Gerar os cards

Em **admin.escolaamadeus.com/dia-dos-pais**, marque as séries e clique em
**Gerar cards**. Isso cria uma linha por aluno, cada uma com um código
curto próprio. Rodar de novo não duplica ninguém.

### 2. Instalar o ffmpeg (uma vez só)

Necessário pra comprimir os vídeos:

```powershell
winget install Gyan.FFmpeg
```

Abra um terminal **novo** depois de instalar.

### 3. Preparar os arquivos

Numa pasta, coloque os vídeos **nomeados com o nome da criança**:

```
Abner Gabriel.mp4
Maria Clara.mov
João Pedro Silva.mp4
```

O script casa o arquivo com o aluno pelo nome, ignorando acento e caixa.
Não precisa ser o nome completo — primeiro nome + sobrenome já resolve.

Mesma coisa pras fotos, em outra pasta.

### 4. Conferir o casamento dos nomes (sem enviar nada)

```powershell
node scripts/subir-videos-pais.mjs --videos "C:\videos-pais" --dry
```

Ele lista o que casou, o que ficou **AMBIGUO** (dois alunos com nome
parecido) e quem ficou **SEM DONO**. Corrija os nomes dos arquivos e rode
de novo até a lista ficar limpa.

> O script **nunca chuta**. Se um arquivo pode ser de dois alunos, ele
> recusa e avisa — entregar o vídeo do filho errado pro pai errado é o
> pior erro possível aqui.

### 5. Enviar pra valer

```powershell
node scripts/subir-videos-pais.mjs --videos "C:\videos-pais"
node scripts/subir-videos-pais.mjs --fotos "C:\fotos-alunos"
```

Cada vídeo é comprimido pra 720p antes de subir — sai de ~60MB para ~8MB.
Isso importa por dois motivos: cabe no plano free do Supabase, e o pai no
4G não fica esperando meio minuto de tela preta.

Também dá pra subir um por um pela tela do admin, se for pouca coisa.

### 6. Conferir

Na tela do admin, o contador mostra quantos têm vídeo e quantos estão sem
foto. Clique no ícone de link externo em qualquer aluno pra ver a página
exatamente como o pai vai ver.

### 7. Imprimir

Botão **Folha de impressão** → sai 4 cards por folha, cada um com 1/4 da
folha, com guias de corte.

Na janela de impressão do Chrome:

| Ajuste | Valor |
|---|---|
| Destino | Salvar como PDF |
| Papel | **Ofício** (o mesmo da placa) |
| Margens | **Nenhuma** |
| Ajustar à página / Fit to page | **desmarcado** |
| Gráficos de plano de fundo | **marcado** |

Os dois últimos são os que mais erram: com "Ajustar à página" ligado o
Chrome encolhe uns 4% e o card não encaixa na placa; sem "Gráficos de
plano de fundo" o card sai branco em vez de azul.

**Imprima uma folha de teste primeiro** e confira na placa de acrílico
antes de rodar as 18 folhas.

Se o tamanho não bater, troque o formato nos botões da barra azul
(Ofício 216×330 · Legal 216×356 · A4 210×297). O card é sempre metade da
largura por metade da altura do papel escolhido.

---

## Filtros úteis na folha de impressão

| URL | O que faz |
|---|---|
| `/imprimir` | Todos que já têm vídeo |
| `/imprimir?serie=3º Ano` | Só uma série |
| `/imprimir?turma=B` | Só uma turma |
| `/imprimir?todos=1` | Inclui quem ainda não tem vídeo (ver o layout) |
| `/imprimir?guias=0` | Sem as linhas de corte |

Dá pra combinar: `?serie=3º Ano&turma=B`.

---

## Arquivos

| Caminho | O quê |
|---|---|
| `supabase/migrations/0019_dia_dos_pais.sql` | Tabela `videos_pais` |
| `lib/dia-dos-pais.ts` | Código curto, URLs assinadas, URL do QR |
| `app/p/[codigo]/page.tsx` | A página que o pai vê |
| `app/admin/(authed)/dia-dos-pais/` | Admin + folha de impressão |
| `components/dia-dos-pais/card-impresso.tsx` | **O card**: medidas em mm, formatos, CSS |
| `app/dev/card/page.tsx` | Prévia do card sem login — só em desenvolvimento |
| `scripts/subir-videos-pais.mjs` | Compressão e upload em lote |
| `public/dia-dos-pais-titulo.png` | Logo da campanha, recortada da arte oficial |

## Mexendo no design do card

Rode `npm run dev` e abra **localhost:3000/dev/card** — mostra os quatro
cards com nomes de exemplo, sem precisar de login nem de dados no banco.
Em produção essa rota responde 404.

Todo o card vive em `components/dia-dos-pais/card-impresso.tsx`. As
medidas são frações da altura do card e **somam ~147mm dos 165mm
disponíveis**, deixando folga pro rodapé. Se aumentar um elemento sem
diminuir outro, o rodapé com a logo da escola sai cortado no papel — e
isso não aparece na tela, só na impressão.

A fonte é **Palatino Linotype**, que está instalada no Windows da escola.
Como o PDF é gerado nessa máquina, é ela que vai pro papel.

## Reaproveitando ano que vem (ou no Dia das Mães)

A estrutura é genérica: aluno + vídeo + código + card. Pra uma próxima
edição, o caminho mais simples é adicionar uma coluna `edicao` em
`videos_pais` e filtrar por ela — os códigos e os cards antigos continuam
funcionando pra sempre.
