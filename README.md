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

## Lâminas e contrato de dados

A página e o PowerPoint seguem exclusivamente as oito lâminas da referência fornecida:
1. Pauta (aba Pauta).
2. Aderência de treinamentos (aba Aderência de Treinamentos).
3. Quantidades de VCT (aba VCT).
4. Resultados de auditorias VCT: itens em não conformidade e resultado médio por unidade, conforme registrados na aba VCT.
5. Desvios por gerência e categoria: valores por unidade da aba Gestão de Desvios; categoria indisponível na fonte.
6. GUT: indisponível na estrutura atual da planilha.
7. OKR: indisponível na estrutura atual da planilha.
8. Kaizens acumulados: soma dos lançamentos preenchidos da aba Kaizen; indica ausência de dados quando vazia.

O PDF define os temas e a sequência, nunca os valores. Não há fallback para planilha local, dados de exemplo ou números do PDF. Cada indicador exibe sua própria referência. Células vazias não são convertidas em zero; zeros explicitamente registrados são preservados. VCT exige quantidades e metas preenchidas para evitar totais parciais. A exportação fica desabilitada até a leitura da fonte concluir.

A fonte atual não permite reconstruir a tabela por procedimento auditado, categorias de desvios, classificações GUT ou metas OKR. Essas limitações aparecem nas próprias lâminas. A aba Kaizen está preparada para receber lançamentos, sem base histórica inventada.
