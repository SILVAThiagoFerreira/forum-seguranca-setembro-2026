# 34º Fórum de Segurança · Setembro 2026

Dashboard estático dos gráficos do fórum (Gerência de Mineração Nordeste/Underground), publicado com GitHub Pages.

- **Site:** https://silvathiagoferreira.github.io/forum-seguranca-setembro-2026/
- **Dados:** `docs/data/forum.json`. Os valores são **fictícios**, só para validar o layout. Para usar dados reais, troque o JSON mantendo a mesma estrutura.
- **PowerPoint:** o botão **Baixar PowerPoint** gera o `.pptx` consolidado no próprio navegador, no padrão das lâminas clean (15 slides, gráficos nativos editáveis).

## Estrutura

- `docs/index.html`, `docs/styles.css`: layout no modelo de página web e identidade visual Enaex.
- `docs/app.js`: seções e gráficos (Chart.js).
- `docs/export.js`: geração do PowerPoint (pptxgenjs).
- `docs/assets/`: logos Enaex.

Publicado pela branch `main`, pasta `/docs`.
