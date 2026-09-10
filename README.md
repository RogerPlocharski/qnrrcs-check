# Checklist QNRCS

Ferramenta gratuita para avaliar a maturidade em cibersegurança de uma
organização segundo o **Quadro Nacional de Referência para a Cibersegurança
(QNRCS)** do Centro Nacional de Cibersegurança.

**https://itcomply.pt**

Sem registo, sem contas e sem publicidade. As respostas ficam guardadas apenas
no navegador de quem preenche — nada é enviado para servidor nenhum.

## O que faz

- **102 subcategorias** do referencial, organizadas pelos cinco objetivos
  (Identificar, Proteger, Detetar, Responder, Recuperar), cada uma com a
  descrição e as evidências dos três níveis de maturidade e as referências
  normativas correspondentes (ISO/IEC 27001, NIST SP 800-53, CIS CSC, COBIT).
- **Dashboard** com cobertura do preenchimento, maturidade média e distribuição
  por objetivo e por nível.
- **Relatório executivo** — síntese, gráficos e uma secção de lacunas
  prioritárias que indica, para cada subcategoria por avaliar, o que é preciso
  para atingir o Nível 1.
- **Relatório técnico** — detalhe subcategoria a subcategoria, com evidências e
  observações.
- **Exportação** em CSV (para folha de cálculo) e em JSON (projeto completo,
  para retomar mais tarde ou passar a um colega).

### Como classificar cada subcategoria

Além dos três níveis de maturidade, existem dois estados que **não** são
equivalentes:

| Estado            | Significado                                          | Efeito no cálculo          |
| ----------------- | ---------------------------------------------------- | -------------------------- |
| **Não existe**    | Aplica-se à organização, mas a capacidade não existe | Conta como maturidade zero |
| **Não aplicável** | Fora do âmbito da organização                        | Excluída da média          |

Esta distinção existe para que uma organização não seja penalizada por
subcategorias que legitimamente não lhe dizem respeito, nem premiada por
capacidades que devia ter e não tem.

## Desenvolvimento

Requer [Node.js](https://nodejs.org). O projeto usa [Bun](https://bun.sh) como
gestor de pacotes (`bun.lock`), mas `npm` também funciona.

```sh
git clone https://github.com/RogerPlocharski/ITcomply.git
cd ITcomply
npm install
npm run dev
```

| Comando          | Efeito                            |
| ---------------- | --------------------------------- |
| `npm run dev`    | Servidor de desenvolvimento       |
| `npm run build`  | Build de produção para `.output/` |
| `npm run lint`   | ESLint                            |
| `npm run format` | Prettier                          |

**Stack:** TanStack Start (React 19, SSR) · Tailwind CSS 4 · shadcn/ui ·
Recharts · TypeScript.

Os dados do referencial estão em [`src/data/checklist.json`](src/data/checklist.json).
As respostas são indexadas pelo código da subcategoria (`ID.GA-1`), não pelo
texto, para que correções de redação não invalidem avaliações já guardadas.

## Deploy

O build usa o preset `cloudflare-module` do Nitro e gera um Worker pronto a
publicar:

```sh
npm run build
npx wrangler --cwd .output deploy
```

### Variáveis de ambiente

| Variável        | Obrigatória | Descrição                                                                                                                                                                                          |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SITE_URL` | Não         | URL pública, usada nas metatags Open Graph. Por omissão `https://itcomply.pt`. Definir em ambientes de pré-visualização para que as pré-visualizações de partilha apontem para o próprio ambiente. |

## Acessibilidade

Os pares de cores foram verificados contra o mínimo AA das WCAG 2.1 (4.5:1 para
texto, 3:1 para marcadores e contornos), em tema claro e escuro. Ao alterar
qualquer token em [`src/styles.css`](src/styles.css), convém reverificar — as
opacidades do tema claro não se transferem para o escuro.

## Apoiar

A ferramenta é gratuita e mantida sem financiamento. Quem a considerar útil pode
contribuir através do botão **Apoiar o Projeto**, dentro da aplicação.
Contribuir é opcional e não desbloqueia nada — a checklist está completa e sem
limitações para toda a gente.

## Aviso

Esta é uma ferramenta de autoavaliação, sem qualquer ligação oficial ao Centro
Nacional de Cibersegurança. Os resultados não constituem certificação nem
substituem uma auditoria formal.

O conteúdo do referencial pertence ao CNCS. Consulte sempre a
[publicação oficial do QNRCS](https://www.cncs.gov.pt) como fonte autoritativa.
