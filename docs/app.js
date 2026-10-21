(function () {
  'use strict';

  // Paleta Enaex (mesma das lâminas)
  const COR = {
    ok: '#3d4248',
    alerta: '#e30613',
    amarelo: '#e2b4b8',
    vermelho: '#b5121b',
    ardosia: '#3d4248',
    cinza: '#8b9096',
    verde: '#1e7a46',
    amareloGut: '#e8b400',
    grade: 'transparent'
  };

  // Unidades sem técnico de segurança: saem da lâmina de inspeções TST
  const SEM_TECNICO = /ferbasa|pa gold|vanadio/;

  // ---------- utilidades ----------
  const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n, d = 1) => fmt(n, d) + '%';
  const sinal = (n, d = 0) => (n > 0 ? '+' : '') + fmt(n, d);
  const soma = (arr) => arr.reduce((a, b) => a + b, 0);
  const media = (arr) => soma(arr) / arr.length;

  // Cria elementos sem innerHTML (texto sempre via textContent)
  function h(tag, attrs, ...filhos) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const f of filhos.flat()) {
      if (f === undefined || f === null || f === false) continue;
      node.append(f instanceof Node ? f : document.createTextNode(String(f)));
    }
    return node;
  }

  function kpi({ rotulo, valor, sub, cor }) {
    return h('div', { class: 'kpi ' + (cor || '') },
      h('div', { class: 'kpi-rotulo' }, rotulo),
      h('div', { class: 'kpi-valor' }, valor),
      sub ? h('div', { class: 'kpi-sub' }, sub) : null);
  }

  function bloco({ id, kicker, titulo, sub, corpo }) {
    return h('section', { class: 'bloco', id: id, 'aria-labelledby': id + '-titulo' },
      h('header', { class: 'bloco-cab' },
        h('span', { class: 'kicker' }, kicker),
        h('h3', { id: id + '-titulo' }, titulo),
        sub ? h('p', {}, sub) : null),
      corpo);
  }

  // Gráficos são criados depois que os blocos estão no DOM (Chart.js precisa do tamanho do canvas)
  let pendentes = [];
  function area(altura, descricao) {
    const canvas = h('canvas', { role: 'img', 'aria-label': descricao });
    return { caixa: h('div', { class: 'grafico ' + (altura || '') }, h('div', { class: 'grafico-plot' }, canvas)), canvas: canvas };
  }
  function grafico(canvas, config) {
    pendentes.push({ canvas: canvas, config: config });
  }

  // ---------- configurações de gráficos ----------
  function configBase(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 }
    }, extra);
  }

  function chartAderencia(a) {
    const meta = a.meta;
    const labels = a.unidades.map((u) => u.nome);
    const valores = a.unidades.map((u) => u.valor);
    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Aderência (%)',
            data: valores,
            order: 2,
            backgroundColor: valores.map((v) => (v >= meta ? COR.ok : COR.vermelho)),
            borderRadius: 3,
            maxBarThickness: 56,
            datalabels: {
              display: true, anchor: 'end', align: 'end', offset: 2,
              color: COR.ardosia, font: { weight: '700', size: 10 },
              formatter: (v) => pct(v, 2)
            }
          },
          {
            type: 'line',
            label: 'Meta ' + meta + '%',
            data: labels.map(() => meta),
            order: 1,
            borderColor: COR.ardosia,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            datalabels: { display: false }
          }
        ]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 110, ticks: { stepSize: 20, callback: (v) => v + '%' }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 10 } } }
        }
      })
    };
  }

  function chartVct(v) {
    const u = v.unidades;
    const series = [
      { label: 'Técnicos de segurança', data: u.map((x) => x.tecnicos), backgroundColor: COR.alerta },
      { label: 'Liderança', data: u.map((x) => x.liderança), backgroundColor: COR.amarelo },
      { label: 'Total realizado', data: u.map((x) => x.tecnicos + x.liderança), backgroundColor: COR.cinza },
      { label: 'Total planejado', data: u.map((x) => x.planejado), backgroundColor: COR.ok }
    ];
    const maximo = Math.max(...series.flatMap((s) => s.data));
    return {
      type: 'bar',
      data: {
        labels: u.map((x) => quebrarNome(x.nome)),
        datasets: series.map((s) => Object.assign({}, s, {
          borderRadius: 2,
          maxBarThickness: 26,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { size: 9, weight: '700' }, formatter: (x) => x }
        }))
      },
      options: configBase({
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, suggestedMax: maximo + 1, ticks: { stepSize: 1 }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 10 } } }
        }
      })
    };
  }

  function chartDesvios(itens) {
    const ordenado = itens.slice().sort((a, b) => b.valor - a.valor);
    const maximo = Math.max(...ordenado.map((x) => x.valor));
    return {
      type: 'bar',
      data: {
        labels: ordenado.map((x) => x.nome),
        datasets: [{
          data: ordenado.map((x) => x.valor),
          backgroundColor: COR.ardosia,
          borderRadius: 2,
          maxBarThickness: 22,
          datalabels: { display: true, anchor: 'end', align: 'right', offset: 4, color: COR.ardosia, font: { weight: '700', size: 10 }, formatter: (x) => fmt(x) }
        }]
      },
      options: configBase({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, suggestedMax: maximo * 1.15 || 1, grid: { color: COR.grade } },
          y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10 } } }
        }
      })
    };
  }

  // Nome de unidade em até três linhas (rótulos do eixo não se sobrepõem)
  function quebrarNome(nome) {
    const linhas = [];
    let atual = '';
    String(nome).split(' ').forEach((p) => {
      if (atual && (atual + ' ' + p).length > 13) { linhas.push(atual); atual = p; }
      else atual = atual ? atual + ' ' + p : p;
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function chartInspecoes(i) {
    const labels = i.unidades.map((u) => quebrarNome(u.nome));
    const maximo = Math.max(...i.unidades.flatMap((u) => [u.realizado, u.meta]));
    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Quantidade realizada', data: i.unidades.map((u) => u.realizado),
            backgroundColor: COR.ardosia, borderRadius: 2, maxBarThickness: 36,
            datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { size: 10, weight: '700' }, formatter: (x) => fmt(x) }
          },
          {
            label: 'Meta' + (i.meta !== null ? ' (' + fmt(i.meta) + ' inspeções)' : ''), data: i.unidades.map((u) => u.meta),
            backgroundColor: COR.vermelho, borderRadius: 2, maxBarThickness: 36,
            datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { size: 10, weight: '700' }, formatter: (x) => fmt(x) }
          }
        ]
      },
      options: configBase({
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, suggestedMax: maximo + 1, ticks: { stepSize: 1 }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 } } }
        }
      })
    };
  }

  // Nº desvios por GUT: uma barra por classe (baixa, média, alta), na cor da classe
  function chartGutClasses(g) {
    const classes = [['baixa', 'Baixa (3 a 6)', COR.verde], ['media', 'Média (7 a 11)', COR.amareloGut], ['alta', 'Alta (12 a 15)', COR.vermelho]];
    const valores = classes.map((c) => g.classes[c[0]]);
    return {
      type: 'bar',
      data: {
        labels: classes.map((c) => c[1]),
        datasets: [{
          label: 'Desvios', data: valores, backgroundColor: classes.map((c) => c[2]), borderRadius: 2, maxBarThickness: 90,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 12 }, formatter: (x) => fmt(x) }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, suggestedMax: Math.max(...valores) * 1.15, ticks: { display: false }, grid: { display: false } },
          x: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } }
        }
      })
    };
  }

  // OKR: barras mensais de conclusão e linha de meta (Appropriated)
  function chartOkr(k) {
    const labels = k.serie.map((m) => m.mes);
    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Conclusão mensal (%)', data: k.serie.map((m) => m.valor), order: 2, backgroundColor: COR.ardosia, borderRadius: 2, maxBarThickness: 56,
            datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 11 }, formatter: (v) => fmt(v) + '%' }
          },
          {
            type: 'line', label: 'Appropriated (' + k.appropriated + '%)', data: labels.map(() => k.appropriated), order: 1,
            borderColor: COR.vermelho, borderWidth: 2, borderDash: [7, 5], pointRadius: 0, datalabels: { display: false }
          }
        ]
      },
      options: configBase({
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { min: 0, max: 110, ticks: { stepSize: 20, callback: (v) => v + '%' }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10 } } }
        }
      })
    };
  }

  function chartKaizens(lista) {
    return {
      type: 'bar',
      data: {
        labels: lista.map((u) => quebrarNome(u.nome)),
        datasets: [{
          label: 'Kaizens acumulados', data: lista.map((u) => u.valor), backgroundColor: COR.ardosia, borderRadius: 2, maxBarThickness: 64,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 11 }, formatter: (v) => fmt(v) }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 55, ticks: { display: false }, grid: { display: false } },
          x: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10 } } }
        }
      })
    };
  }

  // ---------- lâminas ----------
  function renderPauta(d) {
    const metade = Math.ceil(d.pauta.length / 2);
    const colunas = [d.pauta.slice(0, metade), d.pauta.slice(metade)];
    return bloco({
      id: 'pauta',
      kicker: 'Lâmina 1 - Abertura',
      titulo: 'PAUTAS DO FÓRUM',
      sub: d.meta.periodo,
      corpo: h('div', { class: 'pauta-duas' }, colunas.map((col, c) => h('ol', { class: 'pauta', start: c * metade + 1 }, col.map((p) => h('li', {}, p)))))
    });
  }

  function renderInspecoes(d) {
    const i = d.inspecoes;
    const area1 = area('alto', 'Gráfico de colunas agrupadas: quantidade realizada e meta de inspeções TST por unidade');
    grafico(area1.canvas, chartInspecoes(i));
    return bloco({
      id: 'inspecoes',
      kicker: 'Lâmina 3 - Inspeções mensais',
      titulo: 'Inspeções mensais - TST',
      sub: 'Quantidade realizada por unidade. Referência: ' + i.referencia + '.',
      corpo: h('div', {},
        h('div', { class: 'faixa-alerta' },
          h('b', {}, 'Abaixo da meta (' + i.abaixo.length + '): '),
          i.abaixo.length ? i.abaixo.join(', ') : 'nenhuma unidade'),
        area1.caixa)
    });
  }

  function renderAderencia(d) {
    const a = d.aderencia;
    const valores = a.unidades.map((u) => u.valor);
    const media2 = media(valores);
    const atingiram = a.unidades.filter((u) => u.valor >= a.meta).length;
    const abaixo = a.unidades.filter((u) => u.valor < a.meta).map((u) => u.nome);
    const area1 = area('', 'Gráfico de barras: aderência por unidade em porcentagem, com linha de meta');
    grafico(area1.canvas, chartAderencia(a));
    return bloco({
      id: 'aderencia',
      kicker: 'Lâmina 2 - Treinamentos obrigatórios',
      titulo: 'Aderência de treinamentos obrigatórios',
      sub: 'Aderência por unidade (%). Referência: ' + a.referencia + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Meta', valor: pct(a.meta, 0) }),
          kpi({ rotulo: 'Aderência média', valor: pct(media2, 2), sub: 'média simples das unidades', cor: media2 >= a.meta ? 'verde' : 'vermelho' }),
          kpi({ rotulo: 'Unidades na meta', valor: atingiram + ' de ' + a.unidades.length, sub: atingiram === a.unidades.length ? 'todas atingiram' : 'não atingiram: ' + (a.unidades.length - atingiram), cor: atingiram === a.unidades.length ? 'verde' : 'vermelho' }),
          kpi({ rotulo: 'Abaixo da meta', valor: abaixo.length, sub: abaixo.length ? abaixo.join(', ') : 'nenhuma unidade', cor: abaixo.length ? 'vermelho' : 'verde' })),
        area1.caixa,
        h('p', { class: 'legenda-manual' },
          h('i', { style: 'background:' + COR.ok }), 'atingiu a meta',
          h('i', { style: 'background:' + COR.vermelho }), 'abaixo da meta',
          h('i', { style: 'background:' + COR.ardosia }), 'linha tracejada = meta de ' + a.meta + '%'))
    });
  }

  function renderVct(d) {
    const v = d.vct;
    const us = v.unidades;
    const tec = soma(us.map((u) => u.tecnicos));
    const sup = soma(us.map((u) => u.liderança));
    const planTec = soma(us.map((u) => u.planejTec));
    const planSup = soma(us.map((u) => u.planejSup));
    const real = tec + sup;
    const plan = soma(us.map((u) => u.planejado));
    const variacao = plan ? ((real - plan) / plan) * 100 : 0;
    const abaixo = us.filter((u) => u.tecnicos + u.liderança < u.planejado).map((u) => u.nome);
    const area1 = area('', 'Gráfico de colunas agrupadas: técnicos, liderança, total realizado e total planejado por unidade');
    grafico(area1.canvas, chartVct(v));
    return bloco({
      id: 'vct',
      kicker: 'Lâmina 4 - Verificação do ciclo do trabalho (VCT)',
      titulo: 'VCT - Verificação do ciclo do trabalho',
      sub: 'Quantidades realizadas por unidade. Referência: ' + v.referencia + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Técnicos de segurança', valor: fmt(tec), sub: 'planejado: ' + fmt(planTec) }),
          kpi({ rotulo: 'Liderança', valor: fmt(sup), sub: 'planejado: ' + fmt(planSup) }),
          kpi({ rotulo: 'Total realizado', valor: fmt(real), sub: 'técnicos + liderança' }),
          kpi({ rotulo: 'Total planejado', valor: fmt(plan) }),
          kpi({ rotulo: 'Variação', valor: sinal(variacao) + '%', sub: abaixo.length + ' de ' + us.length + ' unidades não atingiram o planejado', cor: variacao < 0 ? 'vermelho' : 'verde' })),
        area1.caixa,
        h('p', { class: 'nota' },
          h('b', {}, 'Atenção, '),
          abaixo.length ? 'unidades abaixo do planejado: ' + abaixo.join(', ') + '.' : 'todas as unidades atingiram o planejado.'))
    });
  }

  // Nº desvios por GUT: cartões por classe (verde, amarelo, vermelho) e total; gráfico por classe
  function renderGut(d) {
    const g = d.gut;
    const total = g.classes.baixa + g.classes.media + g.classes.alta;
    const area1 = area('alto', 'Gráfico de colunas: quantidade de desvios por valor de GUT, coloridas por classe (baixa, média e alta)');
    grafico(area1.canvas, chartGutClasses(g));
    // Cartão: triângulo (seta para a direita) na borda esquerda, na cor da classe; número na cor da classe (amarelo escurecido para leitura); % do total
    const cartao = (rotulo, valor, cor, corValor, sub) => h('div', { class: 'kpi-gut' },
      h('span', { class: 'kpi-tri', style: 'background:' + cor }),
      h('div', { class: 'kpi-topo' },
        h('span', { class: 'kpi-rotulo' }, rotulo)),
      h('div', { class: 'kpi-valor', style: 'color:' + corValor }, fmt(valor)),
      h('div', { class: 'kpi-sub' }, sub));
    const parteTotal = (v) => pct(total ? (v / total) * 100 : 0, 1) + ' do total';
    return bloco({
      id: 'gut',
      kicker: 'Lâmina 6 - Resultados das auditorias (GUT)',
      titulo: 'Nº desvios por GUT',
      sub: 'Dados referentes ao mês de ' + g.periodo + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-gut' },
          cartao('GUT baixa', g.classes.baixa, COR.verde, COR.verde, parteTotal(g.classes.baixa)),
          cartao('GUT média', g.classes.media, COR.amareloGut, '#b58a00', parteTotal(g.classes.media)),
          cartao('GUT alta', g.classes.alta, COR.vermelho, COR.vermelho, parteTotal(g.classes.alta)),
          cartao('Total de desvios', total, COR.ardosia, COR.ardosia, '100% · ' + g.periodo)),
        h('h4', { class: 'sub-bloco' }, 'Quantidade de desvios por classe de GUT'),
        area1.caixa,
        h('p', { class: 'legenda-manual' },
          h('i', { style: 'background:' + COR.verde }), 'GUT baixa (3 a 6)',
          h('i', { style: 'background:' + COR.amareloGut }), 'GUT média (7 a 11)',
          h('i', { style: 'background:' + COR.vermelho }), 'GUT alta (12 a 15)'))
    });
  }

  function renderOkr(d) {
    const k = d.okr;
    const area1 = area('', 'Gráfico de colunas: conclusão mensal dos planos de ação com linha de meta');
    grafico(area1.canvas, chartOkr(k));
    const cabecalho = h('tr', {}, ['KPI', 'UN', 'Gate', 'Appropriated', 'Exceeded'].map((c, i) => h('th', { class: i ? 'centro' : '' }, c)));
    const corpoTab = h('tr', {},
      h('td', { class: 'centro' }, h('div', {}, k.kpi), h('div', { class: 'kpi-detalhe' }, k.kpiDetalhe)),
      h('td', { class: 'centro' }, k.un),
      h('td', { class: 'centro' }, k.gate + '%'),
      h('td', { class: 'centro' }, k.appropriated + '%'),
      h('td', { class: 'centro' }, k.exceeded + '%'));
    const origemSerie = k.fonteSerie === 'planilha' ? ' (série da planilha)' : ' (série da referência)';
    return bloco({
      id: 'okr',
      kicker: 'Lâmina 7 - OKR 2026',
      titulo: 'OKR 2026 - promover a segurança',
      sub: 'Gerência Mineração - Underground/Nordeste',
      corpo: h('div', {},
        h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela tabela-okr' },
          h('thead', {}, cabecalho),
          h('tbody', {}, corpoTab))),
        h('p', { class: 'legenda-manual', style: 'margin-top:22px' }, 'Conclusão mensal dos planos de ação (%)' + origemSerie),
        area1.caixa)
    });
  }

  // OKR 2026 - detalhamento por unidade: conclusão mensal (resolvidos ÷ registrados), abaixo da meta em vermelho suave
  function renderOkrUnidades(d) {
    const k = d.okr;
    const c = d.desvios.conclusaoUnidades;
    const abaixo = (v) => v !== null && v < k.appropriated;
    const celula = (v) => h('td', { class: 'centro' + (abaixo(v) ? ' abaixo-meta' : '') }, v === null ? '–' : fmt(v, 1) + '%');
    const cabecalho = h('tr', {}, h('th', {}, 'Unidade de serviço'), c.meses.map((m) => h('th', { class: 'centro' }, m)));
    const linhas = c.linhas.map((l) => h('tr', {}, h('td', {}, l.nome), l.valores.map((v) => celula(v))));
    const linhaTotal = h('tr', { class: 'grupo' }, h('td', {}, 'Total (todas as unidades)'), c.total.map((v) => celula(v)));
    return bloco({
      id: 'okr-unidades',
      kicker: 'Lâmina 7 - OKR 2026 (detalhamento)',
      titulo: 'OKR 2026 - detalhamento por unidade',
      sub: 'Conclusão mensal dos planos de ação por unidade de serviço (%). Meta: ' + k.appropriated + '%.',
      corpo: h('div', {},
        h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela tabela-okr-un' },
          h('thead', {}, cabecalho),
          h('tbody', {}, linhas, linhaTotal))),
        h('p', { class: 'nota' }, 'Vermelho: abaixo da meta de ' + k.appropriated + '%. "–": sem desvios registrados no mês.'))
    });
  }

  function renderCronograma(d) {
    const itens = d.cronograma;
    const metade = Math.floor(itens.length / 2);
    const linha = (it) => {
      const detalhe = it.status === 'nao_houve' ? 'Não houve fórum' : [it.nome, it.unidade].filter(Boolean).join(' - ');
      const status = it.status === 'ok' ? window.iconeLamina('check', COR.verde)
        : (it.status === 'nao_houve' ? window.iconeLamina('proibido', COR.cinza) : null);
      return h('li', { class: 'cron-item' },
        h('img', { class: 'cron-cal', src: window.iconeLamina('calendario', COR.verde), alt: '' }),
        h('span', { class: 'cron-texto' }, h('b', {}, it.mes + ' ' + it.ano), ' - ', detalhe),
        status ? h('img', { class: 'cron-status', src: status, alt: '' }) : null);
    };
    return bloco({
      id: 'cronograma',
      kicker: 'Lâmina 8 - Cronograma',
      titulo: 'Cronograma - apresentação',
      sub: 'Safety Share',
      corpo: h('div', { class: 'cron-duas' },
        h('ul', { class: 'cron-lista' }, itens.slice(0, metade).map(linha)),
        h('ul', { class: 'cron-lista' }, itens.slice(metade).map(linha)))
    });
  }

  function renderKaizens(d) {
    const kz = d.kaizens;
    const area1 = area('', 'Gráfico de colunas: Kaizens acumulados por unidade de serviço');
    grafico(area1.canvas, chartKaizens(kz.unidades));
    return bloco({
      id: 'kaizens',
      kicker: 'Lâmina 9 - Kaizens',
      titulo: 'Acumulado de Kaizens',
      sub: 'Período - Outubro de 2024 a Agosto de 2026',
      corpo: h('div', {},
        area1.caixa,
        h('div', { class: 'caixa-evolucao' },
          h('img', { src: window.iconeLamina('seta', COR.ardosia), alt: '' }),
          h('div', {},
            h('div', { class: 'evolucao-linha' }, 'Evolução geral: ', h('b', {}, fmt(kz.evolucao, 2) + '%')),
            h('div', { class: 'evolucao-sub' }, 'Total anterior: ' + kz.anterior + ' Kaizens | Total atualizado: ' + kz.atualizado + ' Kaizens'))))
    });
  }

  function renderComplemento(p) {
    let corpo = h('p', { class: 'sem-dados' }, p.nota);
    if (p.linhas && p.linhas.length) {
      corpo = h('div', {}, h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela' },
        h('thead', {}, h('tr', {}, p.colunas.map(c => h('th', {}, c)))),
        h('tbody', {}, p.linhas.map(r => h('tr', {}, r.map(v => h('td', {}, v == null ? 'Sem dados' : v))))))), corpo);
    }
    if (p.itens && p.itens.length) {
      const a = area('alto', p.titulo); grafico(a.canvas, chartDesvios(p.itens));
      corpo = h('div', {}, a.caixa, corpo);
    }
    return bloco({ id: p.id, kicker: 'Lâmina ' + p.numero + ' - Resultados das auditorias', titulo: p.titulo, sub: p.referencia, corpo });
  }

  // ---------- montagem ----------
  const SECOES_NAV = [
    ['pauta', 'Pauta'],
    ['aderencia', 'Treinamentos'],
    ['inspecoes', 'Inspeções TST'],
    ['vct', 'VCT'],
    ['auditorias', 'Auditorias VCT'],
    ['gut', 'Desvios GUT'],
    ['okr', 'OKR'],
    ['okr-unidades', 'OKR por unidade'],
    ['cronograma', 'Cronograma'],
    ['kaizens', 'Kaizens']
  ];

  function renderNav() {
    const nav = document.getElementById('faixa-nav');
    nav.replaceChildren(...SECOES_NAV.map(([id, rotulo]) => h('a', { href: '#' + id }, rotulo)));
  }

  function renderPagina(d) {
    pendentes = [];
    document.title = d.meta.evento + ' · ' + d.meta.periodo;
    const topoSub = document.querySelector('.topo-sub');
    if (topoSub) topoSub.textContent = '· ' + d.meta.periodo;
    document.getElementById('conteudo').replaceChildren(
      renderPauta(d),
      renderAderencia(d),
      ...(d.inspecoes ? [renderInspecoes(d)] : []),
      renderVct(d),
      ...(d.auditorias.linhas.length ? [renderComplemento(d.auditorias)] : []),
      renderGut(d),
      renderOkr(d),
      renderOkrUnidades(d),
      renderCronograma(d),
      renderKaizens(d)
    );
    renderNav();
    desenharGraficos();
  }

  function desenharGraficos() {
    if (typeof Chart === 'undefined') {
      for (const p of pendentes) {
        p.canvas.parentElement.replaceChildren(h('p', { class: 'nota' }, 'Gráfico indisponível: a biblioteca de gráficos não carregou.'));
      }
      return;
    }
    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
    Chart.defaults.font.family = 'Roboto, Arial, sans-serif';
    Chart.defaults.color = COR.ardosia;
    Chart.defaults.plugins.datalabels = { display: false };
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    for (const p of pendentes) new Chart(p.canvas, p.config);
  }

  // ---------- botão PowerPoint ----------
  let pptxCarregando = null;
  function carregarPptxGenJS() {
    if (window.PptxGenJS) return Promise.resolve();
    if (!pptxCarregando) {
      pptxCarregando = new Promise((ok, erro) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
        s.onload = () => ok();
        s.onerror = () => { pptxCarregando = null; erro(new Error('não foi possível carregar o gerador de PowerPoint.')); };
        document.head.append(s);
      });
    }
    return pptxCarregando;
  }

  // ---------- botões de exportação (PowerPoint e PDF) ----------
  function ligarBotoesExportacao(dados) {
    const acoes = {
      'btn-pptx': {
        rotulo: 'PowerPoint',
        executar: async () => {
          await carregarPptxGenJS();
          if (typeof window.baixarApresentacao !== 'function') throw new Error('módulo de exportação ausente.');
          await window.baixarApresentacao(dados);
        }
      },
      'btn-pdf': {
        rotulo: 'PDF',
        executar: async () => {
          if (typeof window.baixarPdf !== 'function') throw new Error('módulo de exportação ausente.');
          await window.baixarPdf(dados);
        }
      }
    };
    const botoes = Object.keys(acoes).map((id) => document.getElementById(id));
    for (const btn of botoes) {
      btn.disabled = false;
      btn.addEventListener('click', async () => {
        const original = btn.innerHTML;
        botoes.forEach((b) => { b.disabled = true; });
        btn.textContent = 'Gerando…';
        try {
          await acoes[btn.id].executar();
        } catch (e) {
          console.error(e);
          alert('Não foi possível gerar o ' + acoes[btn.id].rotulo + ': ' + e.message);
        } finally {
          btn.innerHTML = original;
          botoes.forEach((b) => { b.disabled = false; });
        }
      });
    }
  }

  // ---------- planilha (Google Drive, arquivo .xlsx) ----------
  // Arquivo: "KPI's Segurança do Trabalho (Gerencia de Mineraçao Nordeste e Undergroud).xlsx"
  // O link de exportação do Drive responde com CORS liberado para o GitHub Pages.
  const SHEET_ID = '14LdgBH2N-EUjuCBsdlh_NzeWPv6o85jU';
  const URL_PLANILHA = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=xlsx';

  const EVENTO = '34º Fórum de Segurança';
  const GERENCIA = 'Gerência de Mineração Nordeste/Underground';
  const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const nomeLimpo = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const mesIdx = (v) => MESES.findIndex((m) => norm(v).startsWith(m));
  const arred1 = (x) => Math.round(x * 10) / 10;
  const arred2 = (x) => Math.round(x * 100) / 100;
  function numero(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v == null || String(v).trim() === '') return null;
    const n = Number(String(v).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function abaDe(wb, chave) {
    const nome = wb.SheetNames.find((n) => norm(n).includes(chave));
    if (!nome) throw new Error('aba "' + chave + '" não encontrada na planilha');
    return XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: null, raw: true });
  }

  function montarDados(wb) {
    // Pauta: uma linha com Ano, Mês, Dia do Fórum e os itens a partir da coluna D
    const pa = abaDe(wb, 'pauta');
    const linhaPa = pa[1] || [];
    const miPauta = mesIdx(linhaPa[1]);
    if (miPauta < 0) throw new Error('mês da pauta não reconhecido');
    const pauta = linhaPa.slice(3).map(nomeLimpo).filter(Boolean);
    const periodo = MESES_NOME[miPauta] + ' ' + linhaPa[0];

    // Aderência: linhas "Resultado (%)", unidades a partir da coluna E, meta na coluna C (fração)
    const ad = abaDe(wb, 'aderencia');
    const colsUnidades = [];
    for (let i = 4; i < ad[0].length; i++) if (nomeLimpo(ad[0][i])) colsUnidades.push(i);
    const resultados = ad.slice(1).filter((r) => r && norm(r[3]).startsWith('resultado') && colsUnidades.some((i) => numero(r[i]) !== null));
    if (!resultados.length) throw new Error('nenhum resultado de aderência preenchido');
    resultados.sort((a, b) => (Number(a[0]) * 12 + mesIdx(a[1])) - (Number(b[0]) * 12 + mesIdx(b[1])));
    const ultAd = resultados[resultados.length - 1];
    const metaAd = numero(ultAd[2]);
    if (metaAd === null) throw new Error('meta de treinamentos ausente na planilha');
    const aderencia = {
      referencia: MESES_NOME[mesIdx(ultAd[1])] + ' ' + ultAd[0],
      meta: metaAd !== null && metaAd <= 1 ? arred2(metaAd * 100) : metaAd,
      unidades: colsUnidades.filter((i) => numero(ultAd[i]) !== null)
        .map((i) => ({ nome: nomeLimpo(ad[0][i]), valor: arred2(numero(ultAd[i]) <= 1 ? numero(ultAd[i]) * 100 : numero(ultAd[i])) }))
    };

    // VCT: uma linha por unidade e tipo; colunas de mês a partir da E; mês de referência = último mês preenchido
    const vc = abaDe(wb, 'vct');
    const colsMesVct = [];
    for (let i = 4; i < vc[0].length; i++) {
      const m = mesIdx(vc[0][i]);
      if (m >= 0) colsMesVct.push({ col: i, mes: m });
    }
    const linhasVct = vc.slice(1).filter((r) => r && nomeLimpo(r[1]) && r[2]);
    const mesVct = Math.max(...linhasVct.filter(r => /^(tecnico|lideranca)/.test(norm(r[2]))).flatMap((r) => colsMesVct.filter((c) => numero(r[c.col]) !== null).map((c) => c.mes)));
    if (!Number.isFinite(mesVct)) throw new Error('nenhuma quantidade VCT preenchida');
    const colVct = colsMesVct.find((c) => c.mes === mesVct).col;
    const anoVct = linhasVct[0][0];
    const unidadesVct = [...new Set(linhasVct.map((r) => nomeLimpo(r[1])))];
    const achar = (u, tipo) => linhasVct.find((r) => nomeLimpo(r[1]) === u && norm(r[2]).startsWith(tipo));
    const valorVct = (r) => (r ? numero(r[colVct]) : null);
    const planoVct = (r) => (r ? numero(r[3]) : null);
    const exigir = (v, campo) => { if (v === null) throw new Error('Dado ausente: ' + campo); return v; };
    const vct = {
      referencia: MESES_NOME[mesVct] + ' ' + anoVct,
      unidades: unidadesVct.map((u) => {
        const tec = achar(u, 'tecnico');
        const lid = achar(u, 'lideranca');
        return {
          nome: u,
          tecnicos: exigir(valorVct(tec), u + ' / técnico VCT'),
          liderança: exigir(valorVct(lid), u + ' / liderança VCT'),
          planejTec: exigir(planoVct(tec), u + ' / meta técnico'),
          planejSup: exigir(planoVct(lid), u + ' / meta liderança'),
          planejado: planoVct(tec) + planoVct(lid)
        };
      })
    };

    // Gestão de Desvios: linhas Desvios / Resolvidos / Pendentes por unidade; meses a partir da D.
    // Valor = desvios registrados no mês de referência (último mês com lançamento).
    const gd = abaDe(wb, 'gestao de desvios');
    const colsMesDesv = [];
    for (let i = 3; i < gd[0].length; i++) {
      const m = mesIdx(gd[0][i]);
      if (m >= 0) colsMesDesv.push({ col: i, mes: m });
    }
    const linhasDesv = gd.slice(1).filter((r) => r && nomeLimpo(r[0]) && norm(r[1]));
    const linhasDesvios = linhasDesv.filter((r) => norm(r[1]) === 'desvios');
    const mesDesv = Math.max(...linhasDesvios.flatMap((r) => colsMesDesv.filter((c) => numero(r[c.col]) !== null).map((c) => c.mes)));
    if (!Number.isFinite(mesDesv)) throw new Error('nenhum registro de desvios preenchido');
    const anoDesv = String(linhasDesv[0][2]).trim();
    const colMesDesv = colsMesDesv.find((c) => c.mes === mesDesv).col;
    const resolvDesv = (u) => linhasDesv.find((r) => nomeLimpo(r[0]) === u && norm(r[1]) === 'resolvidos');
    const pendDesv = (u) => linhasDesv.find((r) => nomeLimpo(r[0]) === u && norm(r[1]) === 'pendentes');
    const unidadesDesv = linhasDesvios.filter(r => numero(r[colMesDesv]) !== null).map((r) => {
      const nome = nomeLimpo(r[0]);
      const resolvidos = numero(resolvDesv(nome) && resolvDesv(nome)[colMesDesv]);
      const pendentes = numero(pendDesv(nome) && pendDesv(nome)[colMesDesv]);
      return {
        nome: nome,
        valor: numero(r[colMesDesv]),
        resolvidos: exigir(resolvidos, nome + ' / desvios resolvidos'),
        pendentes: exigir(pendentes, nome + ' / desvios pendentes')
      };
    });
    const totalDesv = soma(unidadesDesv.map((u) => u.valor));
    const resolvidosDesv = soma(unidadesDesv.map((u) => u.resolvidos));
    // Série mensal até o mês de referência: resolvidos / registrados (conclusão dos planos de ação)
    const serieDesv = colsMesDesv.filter((c) => c.mes <= mesDesv).map((c) => {
      const registrados = linhasDesvios.map((r) => numero(r[c.col])).filter((v) => v !== null);
      const resolvidos = linhasDesv.filter((r) => norm(r[1]) === 'resolvidos').map((r) => numero(r[c.col])).filter((v) => v !== null);
      if (!registrados.length) return null;
      const total = soma(registrados);
      const res = soma(resolvidos);
      return { mes: MESES_NOME[c.mes].slice(0, 3), desvios: total, resolvidos: res, conclusao: total ? arred1(res / total * 100) : 0 };
    }).filter(Boolean);
    // Conclusão por unidade e mês: resolvidos ÷ registrados (mesma regra da série geral). null = sem desvios ou sem dado.
    const mesesSerie = colsMesDesv.filter((c) => c.mes <= mesDesv);
    const conclusaoMes = (linhaDes, linhaRes, c) => {
      const reg = numero(linhaDes ? linhaDes[c.col] : null);
      const res = numero(linhaRes ? linhaRes[c.col] : null);
      return reg && res !== null ? arred1(res / reg * 100) : null;
    };
    const nomesDesv = [...new Set(linhasDesvios.map((r) => nomeLimpo(r[0])))];
    const conclusaoUnidades = {
      meses: mesesSerie.map((c) => MESES_NOME[c.mes].slice(0, 3)),
      linhas: nomesDesv.map((u) => {
        const des = linhasDesvios.find((r) => nomeLimpo(r[0]) === u);
        const res = resolvDesv(u);
        return { nome: u, valores: mesesSerie.map((c) => conclusaoMes(des, res, c)) };
      }),
      total: mesesSerie.map((c) => {
        const s = serieDesv.find((m) => m.mes === MESES_NOME[c.mes].slice(0, 3));
        return s ? s.conclusao : null;
      })
    };
    const desvios = {
      referencia: MESES_NOME[mesDesv] + ' ' + anoDesv,
      unidades: unidadesDesv,
      total: totalDesv,
      resolvidos: resolvidosDesv,
      pendentes: totalDesv - resolvidosDesv,
      indice: totalDesv ? arred1(resolvidosDesv / totalDesv * 100) : 0,
      serie: serieDesv,
      conclusaoUnidades: conclusaoUnidades
    };

    // Inspeções Mensais de Segurança (TST): Meta (QTD) e Executado (QTD) por unidade; mês = último com execução lançada
    const ins = abaDe(wb, 'inspecoes').slice(1).filter((r) => r && nomeLimpo(r[2]) && numero(r[4]) !== null && !SEM_TECNICO.test(norm(r[2])));
    let inspecoes = null;
    if (ins.length) {
      const chaveIns = (r) => Number(r[0]) * 12 + mesIdx(r[1]);
      const ultimaChave = Math.max(...ins.map(chaveIns));
      const doMes = ins.filter((r) => chaveIns(r) === ultimaChave);
      const unidadesIns = doMes.map((r) => ({
        nome: nomeLimpo(r[2]),
        meta: exigir(numero(r[3]), nomeLimpo(r[2]) + ' / meta de inspeções'),
        realizado: numero(r[4])
      }));
      const metasIns = [...new Set(unidadesIns.map((u) => u.meta))];
      inspecoes = {
        referencia: MESES_NOME[mesIdx(doMes[0][1])] + ' ' + doMes[0][0],
        meta: metasIns.length === 1 ? metasIns[0] : null,
        unidades: unidadesIns,
        abaixo: unidadesIns.filter((u) => u.realizado < u.meta).map((u) => u.nome)
      };
    }

    // Nº desvios por GUT (aba "Desvios por GUT (Mês)"): linhas de classe Baixa / Média / Alta / Total;
    // a planilha traz as classes por mês, não o detalhamento por valor de GUT. Mês = último com total lançado.
    const gu = abaDe(wb, 'desvios por gut');
    const linhaGut = (nome) => gu.slice(1).find((r) => r && norm(r[0]) === nome);
    const colsMesGut = [];
    for (let i = 3; i < gu[0].length; i++) {
      const m = mesIdx(gu[0][i]);
      if (m >= 0) colsMesGut.push({ col: i, mes: m });
    }
    const colGut = colsMesGut.filter((c) => numero(linhaGut('total') ? linhaGut('total')[c.col] : null) !== null).sort((a, b) => b.mes - a.mes)[0];
    if (!colGut) throw new Error('nenhum total de desvios por GUT preenchido');
    const valorGut = (nome) => { const r = linhaGut(nome); return exigir(numero(r ? r[colGut.col] : null), 'GUT / ' + nome); };
    const gutClasses = { baixa: valorGut('baixa'), media: valorGut('media'), alta: valorGut('alta') };
    const anoGut = String(gu.slice(1).find((r) => r && norm(r[1]) === 'desvio')[2]).trim();
    const gut = {
      periodo: MESES_NOME[colGut.mes].toLowerCase() + ' de ' + anoGut,
      classes: gutClasses
    };

    // Cronograma de apresentação (aba "Cronograma Safety Share"): Ano, Mês, Responsável, Status
    const cronograma = abaDe(wb, 'cronograma').slice(1).filter((r) => r && mesIdx(r[1]) >= 0).map((r) => {
      const st = norm(r[3]);
      const nome = nomeLimpo(r[2]);
      return {
        mes: MESES_NOME[mesIdx(r[1])],
        ano: Number(r[0]),
        nome: nome && nome !== '-' ? nome : null,
        unidade: null,
        status: st.startsWith('realizado') ? 'ok' : (st.startsWith('nao houve') ? 'nao_houve' : 'pendente')
      };
    });
    if (!cronograma.length) throw new Error('cronograma de apresentação vazio');

    const auditorias = {
      id: 'auditorias', numero: 5, titulo: 'VCT - Resultados das auditorias', referencia: vct.referencia,
      colunas: ['Unidade de serviço', 'Itens em não conformidade', 'Resultado médio (%)', 'Quantidade Realizada'],
      linhas: unidadesVct.map(u => {
        const nc = achar(u, 'itens em nao conformidade');
        const tec = valorVct(achar(u, 'tecnico'));
        const lid = valorVct(achar(u, 'lideranca'));
        const resultado = linhasVct.find(r => nomeLimpo(r[1]) === u && /^(resultado|resultato) medio/.test(norm(r[2])));
        return [u, valorVct(nc), valorVct(resultado) === null ? null : pct(valorVct(resultado) * 100, 2), tec === null || lid === null ? null : tec + lid];
      }),
      nota: 'Valores registrados na aba VCT. A planilha não informa procedimentos auditados, número de auditorias conformes ou meta de conformidade; esses indicadores não são estimados.'
    };

    const dados = {
      meta: {
        evento: EVENTO,
        gerencia: GERENCIA,
        periodo: periodo,
        aviso: 'Fonte: planilha "KPI’s Segurança do Trabalho" no Google Drive. Referências: pauta ' + periodo + '; aderência ' + aderencia.referencia + '; VCT ' + vct.referencia + '; desvios ' + desvios.referencia + '.'
      },
      auditorias,
      pauta: pauta,
      aderencia: aderencia,
      inspecoes: inspecoes,
      vct: vct,
      desvios: desvios
    };
    // GUT e cronograma vêm da planilha. Parâmetros do OKR (Gate, Appropriated, Exceeded) e Kaizens não existem
    // na planilha e vêm de docs/dados-referencia.js. Na série mensal do OKR, a planilha tem prioridade.
    const ref = window.DADOS_REFERENCIA;
    if (!ref) throw new Error('dados-referencia.js não carregou');
    const seriePlanilha = desvios.serie.map((m) => ({ mes: m.mes, valor: m.conclusao }));
    dados.gut = gut;
    dados.okr = Object.assign({}, ref.okr, {
      serie: seriePlanilha.length ? seriePlanilha : ref.okr.serieReferencia,
      fonteSerie: seriePlanilha.length ? 'planilha' : 'referência'
    });
    dados.cronograma = cronograma;
    dados.kaizens = ref.kaizens;
    if (!dados.pauta.length || !dados.aderencia.unidades.length || !dados.vct.unidades.length || !dados.desvios.unidades.length) {
      throw new Error('estrutura da planilha diferente do esperado');
    }
    return dados;
  }

  async function carregarPlanilha() {
    const resp = await fetch(URL_PLANILHA + '&_=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    if (typeof XLSX === 'undefined') throw new Error('biblioteca de leitura de planilha não carregou');
    const wb = XLSX.read(await resp.arrayBuffer(), { type: 'array' });
    return montarDados(wb);
  }

  // ---------- início ----------
  async function iniciar() {
    const conteudo = document.getElementById('conteudo');
    let dados;
    try {
      dados = await carregarPlanilha();
    } catch (e) {
      console.error(e);
      conteudo.replaceChildren(h('p', { class: 'erro' },
        'Não foi possível carregar a planilha do Google Drive (' + e.message + '). ' +
        'Confirme que o arquivo está compartilhado com "qualquer pessoa com o link" e recarregue a página.'));
      return;
    }
    renderPagina(dados);
    ligarBotoesExportacao(dados);
  }

  window.ForumDados = { montarDados, carregarPlanilha };
  iniciar();
})();
