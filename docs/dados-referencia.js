// valores transcritos das referências do fórum; atualizar manualmente
// Fontes: imagens 2.png (OKR) e 7.png (Kaizens).
// Não estão na planilha: parâmetros do OKR (Gate, Appropriated, Exceeded) e Kaizens.
// GUT e cronograma são lidos da planilha (app.js). Na série mensal do OKR, a planilha tem prioridade.
(function () {
  'use strict';

  window.DADOS_REFERENCIA = {
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
