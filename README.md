# 34º Fórum de Segurança · Setembro 2026

Dashboard estático dos gráficos do fórum (Gerência de Mineração Nordeste/Underground), publicado com GitHub Pages.

- **Site:** https://silvathiagoferreira.github.io/forum-seguranca-setembro-2026/
- **Dados:** lidos ao vivo da planilha `KPI's Segurança do Trabalho (Gerencia de Mineraçao Nordeste e Undergroud).xlsx` no Google Drive (ID `14LdgBH2N-EUjuCBsdlh_NzeWPv6o85jU`), via `export?format=xlsx`. A planilha precisa estar compartilhada com "qualquer pessoa com o link". Não há outra fonte de dados.
- **PowerPoint:** o botão **Baixar PowerPoint** gera o `.pptx` consolidado no próprio navegador, no padrão das lâminas clean (gráficos nativos editáveis), com os mesmos dados da página.

## Estrutura

- `docs/index.html`, `docs/styles.css`: layout no modelo de página web e identidade visual Enaex.
- `docs/app.js`: seções e gráficos (Chart.js).
- `docs/export.js`: geração do PowerPoint (pptxgenjs).
- `docs/assets/`: logos Enaex.

Publicado pela branch `main`, pasta `/docs`.
