// valores transcritos das referências do fórum; atualizar manualmente
// Fontes: imagens 2.png (OKR), 3.webp (GUT), 6.webp (cronograma) e 7.png (Kaizens).
// A planilha não traz estes dados. Quando a planilha tiver a série mensal de conclusão
// (aba Gestão de Desvios), app.js usa a planilha no gráfico do OKR.
(function () {
  'use strict';

  window.DADOS_REFERENCIA = {
    // 3.webp - Nº desvios por GUT. O revisor informou que os dados são de setembro de 2026.
    // Total = soma das classes (321 + 166 + 9 = 496; a imagem de origem trazia 373, valor não reconciliado).
    gut: {
      periodo: 'setembro de 2026',
      classes: { baixa: 321, media: 166, alta: 9 },
      // Classes: Baixa = GUT 3 a 6; Média = GUT 7 a 11; Alta = GUT 12 a 15
      porGut: [
        { gut: 3, valor: 20 }, { gut: 4, valor: 6 }, { gut: 5, valor: 41 }, { gut: 6, valor: 254 },
        { gut: 7, valor: 91 }, { gut: 8, valor: 36 }, { gut: 9, valor: 21 }, { gut: 10, valor: 13 },
        { gut: 11, valor: 5 }, { gut: 12, valor: 5 }, { gut: 13, valor: 1 }, { gut: 14, valor: 2 },
        { gut: 15, valor: 1 }
      ]
    },

    // 2.png - OKR 2026, Gerência Mineração - Underground/Nordeste
    okr: {
      kpi: 'Conclusão dos Planos de Ação = 2,5%',
      kpiDetalhe: '2.1 - Desvios - GUT Médio/Alto.',
      un: '%',
      gate: 93,
      appropriated: 96,
      exceeded: 98,
      // Usada só se a planilha não tiver a série mensal de conclusão
      serieReferencia: [
        { mes: 'Jan', valor: 63 }, { mes: 'Fev', valor: 59 }, { mes: 'Mar', valor: 60 }, { mes: 'Abr', valor: 68 },
        { mes: 'Mai', valor: 51 }, { mes: 'Jun', valor: 40 }, { mes: 'Jul', valor: 31 }, { mes: 'Ago', valor: 24 }
      ]
    },

    // 6.webp - Cronograma de apresentação (status 'ok' = check; 'nao_houve'; 'pendente' = sem check).
    // Janeiro: não há apresentador em nenhuma aba da planilha (verificado); fica como "sem registro".
    cronograma: [
      { mes: 'Janeiro', ano: 2026, nome: null, unidade: null, status: 'sem_registro' },
      { mes: 'Fevereiro', ano: 2026, nome: 'Henrique Gama', unidade: 'US Vale Verde', status: 'ok' },
      { mes: 'Março', ano: 2026, nome: 'Bruna Matos', unidade: 'US Jacobina', status: 'ok' },
      { mes: 'Abril', ano: 2026, nome: 'Valdivino', unidade: 'US Vanádio', status: 'ok' },
      { mes: 'Maio', ano: 2026, nome: 'Adriano Ribeiro', unidade: 'US Pedra Branca', status: 'ok' },
      { mes: 'Junho', ano: 2026, nome: null, unidade: null, status: 'nao_houve' },
      { mes: 'Julho', ano: 2026, nome: 'José Wilkinson', unidade: 'US Vale Verde', status: 'ok' },
      { mes: 'Agosto', ano: 2026, nome: 'Jeobanne Ferreira', unidade: 'US ATN', status: 'ok' },
      { mes: 'Setembro', ano: 2026, nome: 'Denilson Pontes', unidade: 'Frotas', status: 'pendente' },
      { mes: 'Outubro', ano: 2026, nome: 'Ricardo Santana', unidade: 'US Caraíba', status: 'pendente' },
      { mes: 'Novembro', ano: 2026, nome: 'Daniele Rodrigues', unidade: 'US Aripuanã', status: 'pendente' },
      { mes: 'Dezembro', ano: 2026, nome: 'Diogo Barros', unidade: null, status: 'pendente' }
    ],

    // 7.png - Acumulados Kaizens, outubro de 2024 a agosto de 2026 (ordem decrescente)
    kaizens: {
      anterior: 218,
      atualizado: 227,
      evolucao: 4.13,
      unidades: [
        { nome: 'US Atlantic Níquel', valor: 48 },
        { nome: 'US Vale Verde', valor: 44 },
        { nome: 'US Jacobina', valor: 44 },
        { nome: 'US Caraíba', valor: 35 },
        { nome: 'US Vanádio', valor: 31 },
        { nome: 'US Nexa Aripuanã', valor: 28 },
        { nome: 'US Avanço Pedra Branca', valor: 17 },
        { nome: 'US Borborema', valor: 12 },
        { nome: 'US Ferbasa', valor: 5 },
        { nome: 'US PA Gold', valor: 3 },
        { nome: 'US NX Gold', valor: 0 }
      ]
    }
  };
})();
