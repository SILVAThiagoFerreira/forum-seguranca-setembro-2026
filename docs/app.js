(function () {
  'use strict';

  // Paleta do site (Enaex): ardósia da capa + vermelho da marca + tons das lâminas clean
  const COR = {
    ok: '#2e7d4f',
    alerta: '#e07b20',
    amarelo: '#e0a526',
    vermelho: '#b5121b',
    ardosia: '#3d4248',
    cinza: '#8b9096',
    cinzaClaro: '#c4c8cc',
    azul: '#2f6690',
    grade: '#eceef1'
  };
  const COR_CLASSE = { vermelho: COR.vermelho, laranja: COR.alerta, verde: COR.ok, azul: COR.azul };
  const TEXTO_DIA = { ok: 'sem ocorrência', ocorrencia: 'ocorrência', dano_pessoal: 'dano pessoal' };

  // ---------- utilidades ----------
  const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n, d = 1) => fmt(n, d) + '%';
  const sinal = (n, d = 0) => (n > 0 ? '+' : '') + fmt(n, d);
  const soma = (arr) => arr.reduce((a, b) => a + b, 0);
  const media = (arr) => soma(arr) / arr.length;

  // Cria elementos sem usar innerHTML (texto sempre via textContent)
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
    return { caixa: h('div', { class: 'grafico ' + (altura || '') }, canvas), canvas: canvas };
  }
  function grafico(canvas, config) {
    pendentes.push({ canvas: canvas, config: config });
  }

  function tabela(cabecalhos, linhas, rodape) {
    const thead = h('thead', {}, h('tr', {}, cabecalhos.map((c) => h('th', { class: c.classe || '' }, c.texto))));
    const tbody = h('tbody', {}, linhas.map((linha) => h('tr', {}, linha.map((c) => h('td', { class: c.classe || '' }, c.conteudo)))));
    const tfoot = rodape ? h('tfoot', {}, h('tr', {}, rodape.map((c) => h('td', { class: c.classe || '' }, c.conteudo)))) : null;
    return h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela' }, thead, tbody, tfoot));
  }

  function pill(texto, tipo) {
    return h('span', { class: 'pill ' + tipo }, texto);
  }

  // ---------- configurações de gráficos ----------
  function configBase(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 }
    }, extra);
  }

  function chartAderencia(d) {
    const meta = d.aderencia.meta;
    const labels = d.aderencia.unidades.map((u) => u.nome);
    const valores = d.aderencia.unidades.map((u) => u.valor);
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
              color: COR.ardosia, font: { weight: '700', size: 11 },
              formatter: (v) => pct(v, 1)
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
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 11 } } }
        }
      })
    };
  }

  function chartVctQuantidades(d) {
    const u = d.vct.quantidades.unidades;
    const series = [
      { label: 'Técnicos de segurança', data: u.map((x) => x.tecnicos), backgroundColor: COR.alerta },
      { label: 'Supervisores', data: u.map((x) => x.supervisores), backgroundColor: COR.amarelo },
      { label: 'Total realizado', data: u.map((x) => x.tecnicos + x.supervisores), backgroundColor: COR.cinza },
      { label: 'Total planejado', data: u.map((x) => x.planejado), backgroundColor: COR.ok }
    ];
    const maximo = Math.max(...series.flatMap((s) => s.data));
    return {
      type: 'bar',
      data: {
        labels: u.map((x) => x.nome),
        datasets: series.map((s) => Object.assign({}, s, {
          borderRadius: 2,
          maxBarThickness: 26,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { size: 10, weight: '700' }, formatter: (v) => v }
        }))
      },
      options: configBase({
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, suggestedMax: maximo + 1, ticks: { stepSize: 1 }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 11 } } }
        }
      })
    };
  }

  function chartBarrasHorizontais(itens, cor) {
    const ordenado = itens.slice().sort((a, b) => b.valor - a.valor);
    const maximo = Math.max(...ordenado.map((x) => x.valor));
    return {
      type: 'bar',
      data: {
        labels: ordenado.map((x) => x.nome),
        datasets: [{
          data: ordenado.map((x) => x.valor),
          backgroundColor: cor,
          borderRadius: 2,
          maxBarThickness: 22,
          datalabels: { display: true, anchor: 'end', align: 'right', offset: 4, color: COR.ardosia, font: { weight: '700', size: 11 }, formatter: (v) => fmt(v) }
        }]
      },
      options: configBase({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, suggestedMax: maximo * 1.15, grid: { color: COR.grade } },
          y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } }
        }
      })
    };
  }

  function chartGutClasses(d) {
    const classes = d.desvios.gut.classes;
    return {
      type: 'bar',
      data: {
        labels: classes.map((c) => c.nome),
        datasets: [{
          data: classes.map((c) => c.valor),
          backgroundColor: [COR.ok, COR.amarelo, COR.vermelho],
          borderRadius: 3,
          maxBarThickness: 90,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 13 }, formatter: (v) => fmt(v) }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: COR.grade } },
          x: { grid: { display: false } }
        }
      })
    };
  }

  function chartGutNotas(d) {
    const notas = d.desvios.gut.notas;
    return {
      type: 'bar',
      data: {
        labels: notas.map((n) => String(n.nota)),
        datasets: [{
          label: 'Desvios',
          data: notas.map((n) => n.valor),
          backgroundColor: notas.map((n) => (n.nota >= 10 ? COR.vermelho : COR.ardosia)),
          borderRadius: 2,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { size: 10, weight: '700' }, formatter: (v) => (v > 0 ? v : '') }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: COR.grade } },
          x: { grid: { display: false }, title: { display: true, text: 'Nota GUT', color: COR.ardosia } }
        }
      })
    };
  }

  function chartOkr(d) {
    const meses = d.okr.meses;
    const meta = d.okr.meta;
    return {
      type: 'bar',
      data: {
        labels: meses.map((m) => m.mes),
        datasets: [
          {
            label: 'Conclusão (%)',
            data: meses.map((m) => m.valor),
            order: 2,
            backgroundColor: COR.vermelho,
            borderRadius: 3,
            maxBarThickness: 60,
            datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 12 }, formatter: (v) => v + '%' }
          },
          {
            type: 'line',
            label: 'Meta ' + meta + '%',
            data: meses.map(() => meta),
            order: 1,
            borderColor: COR.ok,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            datalabels: { display: false }
          }
        ]
      },
      options: configBase({
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 20, callback: (v) => v + '%' }, grid: { color: COR.grade } },
          x: { grid: { display: false } }
        }
      })
    };
  }

  function chartMensal(valores, meses, descricao) {
    const maximo = Math.max(...valores);
    return {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{
          label: descricao,
          data: valores,
          backgroundColor: COR.ardosia,
          borderRadius: 3,
          maxBarThickness: 44,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: COR.ardosia, font: { weight: '700', size: 12 }, formatter: (v) => (v > 0 ? v : '') }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, suggestedMax: maximo + 1, ticks: { stepSize: 1 }, grid: { color: COR.grade } },
          x: { grid: { display: false } }
        }
      })
    };
  }

  function chartKaizen(d) {
    const u = d.kaizen.unidades;
    const maximo = Math.max(...u.map((x) => x.valor));
    return {
      type: 'bar',
      data: {
        labels: u.map((x) => x.nome),
        datasets: [{
          label: 'Kaizens acumulados',
          data: u.map((x) => x.valor),
          backgroundColor: COR.ardosia,
          borderRadius: 3,
          maxBarThickness: 60,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 12 }, formatter: (v) => fmt(v) }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, suggestedMax: Math.ceil((maximo + 5) / 10) * 10, ticks: { stepSize: 10 }, grid: { color: COR.grade } },
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 11 } } }
        }
      })
    };
  }

  // ---------- seções ----------
  function renderHero(d) {
    const ader = d.aderencia.unidades;
    const mediaAder = media(ader.map((u) => u.valor));
    const naMeta = ader.filter((u) => u.valor >= d.aderencia.meta).length;
    const realizado = soma(d.vct.quantidades.unidades.map((u) => u.tecnicos + u.supervisores));
    const planejado = soma(d.vct.quantidades.unidades.map((u) => u.planejado));
    const variacaoVct = ((realizado - planejado) / planejado) * 100;
    const desvios = soma(d.desvios.porGerencia.map((x) => x.valor));
    const okrAtual = d.okr.meses[d.okr.meses.length - 1];
    const misfire = soma(d.misfire.mensal);
    const kaizenAtual = soma(d.kaizen.unidades.map((u) => u.valor));
    const evoKaizen = ((kaizenAtual - d.kaizen.anterior) / d.kaizen.anterior) * 100;
    return h('section', { class: 'kpis', 'aria-label': 'Indicadores principais' },
      kpi({ rotulo: 'Aderência média', valor: pct(mediaAder), sub: naMeta + ' de ' + ader.length + ' unidades na meta de ' + d.aderencia.meta + '%', cor: naMeta === ader.length ? 'verde' : 'vermelho' }),
      kpi({ rotulo: 'VCT realizadas', valor: realizado + '/' + planejado, sub: 'variação ' + sinal(variacaoVct) + '% vs. planejado', cor: variacaoVct < 0 ? 'vermelho' : 'verde' }),
      kpi({ rotulo: 'Desvios no mês', valor: fmt(desvios), sub: d.desvios.referencia, cor: 'amarelo' }),
      kpi({ rotulo: 'Conclusão dos planos', valor: pct(okrAtual.valor, 0), sub: okrAtual.mes + ', meta ' + d.okr.meta + '%', cor: okrAtual.valor >= d.okr.meta ? 'verde' : 'vermelho' }),
      kpi({ rotulo: 'Misfire no ano', valor: fmt(misfire), sub: d.misfire.desviosRelacionados + ' desvios relacionados', cor: 'azul' }),
      kpi({ rotulo: 'Kaizens acumulados', valor: fmt(kaizenAtual), sub: sinal(evoKaizen, 2) + '% vs. total anterior (' + d.kaizen.anterior + ')', cor: 'verde' }));
  }

  function renderPauta(d) {
    return bloco({
      id: 'pauta',
      kicker: 'Abertura',
      titulo: 'Pauta do fórum',
      corpo: h('ol', { class: 'pauta' }, d.pauta.map((p) => h('li', {}, p)))
    });
  }

  function renderAderencia(d) {
    const a = d.aderencia;
    const area1 = area('', 'Gráfico de barras: aderência por unidade em porcentagem, com linha de meta');
    grafico(area1.canvas, chartAderencia(d));
    const atingiram = a.unidades.filter((u) => u.valor >= a.meta).length;
    const abaixo = a.unidades.filter((u) => u.valor < a.meta).map((u) => u.nome);
    return bloco({
      id: 'aderencia',
      kicker: '01 · Treinamentos obrigatórios',
      titulo: a.titulo,
      sub: a.subtitulo,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Meta', valor: pct(a.meta, 0), cor: '' }),
          kpi({ rotulo: 'Unidades na meta', valor: atingiram + ' de ' + a.unidades.length, cor: 'verde' }),
          kpi({ rotulo: 'Abaixo da meta', valor: abaixo.length ? abaixo.join(', ') : 'nenhuma', cor: abaixo.length ? 'vermelho' : 'verde' })),
        area1.caixa,
        h('p', { class: 'legenda-manual' },
          h('i', { style: 'background:' + COR.ok }), 'atingiu a meta',
          h('i', { style: 'background:' + COR.vermelho }), 'abaixo da meta',
          h('i', { style: 'background:' + COR.ardosia }), 'linha tracejada = meta de ' + a.meta + '%'),
        h('p', { class: 'nota' }, h('b', {}, 'Atenção, '), 'valores fictícios de demonstração.'))
    });
  }

  function renderVctQuantidades(d) {
    const q = d.vct.quantidades;
    const tec = soma(q.unidades.map((u) => u.tecnicos));
    const sup = soma(q.unidades.map((u) => u.supervisores));
    const real = tec + sup;
    const plan = soma(q.unidades.map((u) => u.planejado));
    const variacao = ((real - plan) / plan) * 100;
    const abaixo = q.unidades.filter((u) => u.tecnicos + u.supervisores < u.planejado).length;
    const area1 = area('', 'Gráfico de colunas agrupadas: VCT realizadas e planejadas por unidade');
    grafico(area1.canvas, chartVctQuantidades(d));
    return bloco({
      id: 'vct-quantidades',
      kicker: '02 · Verificação do ciclo do trabalho (VCT)',
      titulo: q.titulo,
      sub: 'Referência: ' + q.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Técnicos realizados', valor: fmt(tec) }),
          kpi({ rotulo: 'Supervisores realizados', valor: fmt(sup) }),
          kpi({ rotulo: 'Total realizado', valor: fmt(real) }),
          kpi({ rotulo: 'Total planejado', valor: fmt(plan) }),
          kpi({ rotulo: 'Variação', valor: sinal(variacao) + '%', sub: abaixo + ' de ' + q.unidades.length + ' unidades abaixo do planejado', cor: variacao < 0 ? 'vermelho' : 'verde' })),
        area1.caixa,
        h('p', { class: 'nota' }, h('b', {}, 'Atenção, '), 'a barra cinza é o total realizado (técnicos + supervisores) e a barra verde é o planejado.'))
    });
  }

  function renderVctAuditorias(d) {
    const a = d.vct.auditorias;
    const conf = soma(a.procedimentos.map((p) => p.conforme));
    const nconf = soma(a.procedimentos.map((p) => p.naoConforme));
    const total = conf + nconf;
    const indice = (conf / total) * 100;
    const linhas = a.procedimentos.map((p) => [
      { conteudo: p.nome },
      { conteudo: fmt(p.conforme), classe: 'num' },
      { conteudo: fmt(p.naoConforme), classe: 'num' },
      { conteudo: p.desvio || '—' }
    ]);
    const rodape = [
      { conteudo: 'Total' },
      { conteudo: fmt(conf), classe: 'num' },
      { conteudo: fmt(nconf), classe: 'num' },
      { conteudo: '' }
    ];
    return bloco({
      id: 'vct-auditorias',
      kicker: '02 · Verificação do ciclo do trabalho (VCT)',
      titulo: a.titulo,
      sub: 'Referência: ' + a.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Conformes', valor: fmt(conf), cor: 'verde' }),
          kpi({ rotulo: 'Não conformes', valor: fmt(nconf), cor: nconf ? 'vermelho' : 'verde' }),
          kpi({ rotulo: 'Total de VCTs', valor: fmt(total) }),
          kpi({ rotulo: 'Índice de conformidade', valor: pct(indice), sub: 'meta ≥ ' + a.meta + '%', cor: indice >= a.meta ? 'verde' : 'vermelho' })),
        tabela([
          { texto: 'Procedimento auditado' },
          { texto: 'Conforme', classe: 'num' },
          { texto: 'Não conforme', classe: 'num' },
          { texto: 'Principais desvios' }
        ], linhas, rodape))
    });
  }

  function renderDesvios(d) {
    const ger = d.desvios.porGerencia;
    const cat = d.desvios.porCategoria;
    const total = soma(ger.map((x) => x.valor));
    const topCat = cat.slice().sort((a, b) => b.valor - a.valor)[0];
    const areaGer = area('alto', 'Barras horizontais: desvios por gerência');
    const areaCat = area('alto', 'Barras horizontais: desvios por categoria');
    grafico(areaGer.canvas, chartBarrasHorizontais(ger, COR.ardosia));
    grafico(areaCat.canvas, chartBarrasHorizontais(cat, COR.vermelho));
    return bloco({
      id: 'desvios',
      kicker: '03 · Registros de desvios',
      titulo: 'Nº de desvios por gerência e categoria',
      sub: 'Referência: ' + d.desvios.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Total de desvios', valor: fmt(total), cor: 'vermelho' }),
          kpi({ rotulo: 'Gerências', valor: String(ger.length) }),
          kpi({ rotulo: 'Categoria principal', valor: topCat.nome, sub: fmt(topCat.valor) + ' desvios' })),
        h('div', { class: 'grade-2' },
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Por gerência'), areaGer.caixa),
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Por categoria'), areaCat.caixa)))
    });
  }

  function renderGut(d) {
    const g = d.desvios.gut;
    const total = soma(g.classes.map((c) => c.valor));
    const areaCls = area('', 'Colunas: desvios por classe GUT');
    const areaNotas = area('', 'Colunas: desvios por nota GUT');
    grafico(areaCls.canvas, chartGutClasses(d));
    grafico(areaNotas.canvas, chartGutNotas(d));
    const altoTotal = soma(g.altoPorGerencia.map((x) => x.valor));
    return bloco({
      id: 'gut',
      kicker: '03 · Registros de desvios',
      titulo: g.titulo,
      sub: 'Classificação GUT (gravidade × urgência × tendência) dos desvios de ' + d.desvios.referencia.toLowerCase() + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Total de GUTs', valor: fmt(total) }),
          kpi({ rotulo: 'Classe baixa', valor: fmt(g.classes[0].valor), cor: 'verde' }),
          kpi({ rotulo: 'Classe média', valor: fmt(g.classes[1].valor), cor: 'amarelo' }),
          kpi({ rotulo: 'Classe alta', valor: fmt(g.classes[2].valor), cor: 'vermelho' })),
        h('div', { class: 'grade-2' },
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Desvios por classe'), areaCls.caixa),
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Desvios por nota GUT (vermelho = notas 10 a 15)'), areaNotas.caixa)),
        h('div', { class: 'tabela-wrap', style: 'margin-top:16px' },
          h('p', { class: 'rotulo-grafico' }, 'GUT alto por gerência'),
          tabela([{ texto: 'Gerência' }, { texto: 'Desvios', classe: 'num' }],
            g.altoPorGerencia.map((x) => [{ conteudo: x.nome }, { conteudo: fmt(x.valor), classe: 'num' }]),
            [{ conteudo: 'Total' }, { conteudo: fmt(altoTotal), classe: 'num' }])))
    });
  }

  function renderOkr(d) {
    const o = d.okr;
    const area1 = area('', 'Colunas mensais: conclusão dos planos de ação com linha de meta');
    grafico(area1.canvas, chartOkr(d));
    const ultimo = o.meses[o.meses.length - 1];
    return bloco({
      id: 'okr',
      kicker: '04 · OKR 2026',
      titulo: o.titulo,
      sub: o.indicador,
      corpo: h('div', { class: 'grade-2' },
        h('div', {}, area1.caixa),
        h('div', { class: 'kaizen-kpis' },
          kpi({ rotulo: 'Último mês (' + ultimo.mes + ')', valor: pct(ultimo.valor, 0), cor: ultimo.valor >= o.meta ? 'verde' : 'vermelho' }),
          kpi({ rotulo: 'Gate', valor: o.kpis[0].valor + '%' }),
          kpi({ rotulo: 'Appropriated (meta)', valor: o.kpis[1].valor + '%', cor: 'verde' }),
          kpi({ rotulo: 'Exceeded', valor: o.kpis[2].valor + '%' })))
    });
  }

  function renderTimeline(d, chave, rotuloId, kickerTexto, titulo) {
    const t = d[chave];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const total = soma(t.mensal);
    const area1 = area('baixo', 'Colunas mensais: ocorrências no ano');
    grafico(area1.canvas, chartMensal(t.mensal, meses, titulo));
    return bloco({
      id: rotuloId,
      kicker: kickerTexto,
      titulo: titulo,
      sub: 'Ocorrências por mês em ' + t.ano + ' (total ' + total + ')',
      corpo: h('div', { class: 'grade-2' },
        h('div', {}, area1.caixa),
        h('div', {},
          h('div', { class: 'classes' },
            t.classes.map((c) => h('div', { class: 'classe ' + c.cor },
              h('div', { class: 'classe-valor' }, fmt(c.valor)),
              h('div', { class: 'classe-nome' }, c.nome)))),
          h('div', { class: 'grade-kpi', style: 'margin-top:12px' },
            kpi({ rotulo: 'Desvios relacionados', valor: fmt(t.desviosRelacionados), cor: 'azul' }))),
        h('ul', { class: 'lista-eventos' }, t.eventos.map((e) => h('li', {}, e))))
    });
  }

  function renderCruzVerde(d) {
    const c = d.cruzVerde;
    const legenda = [['ok', 'sem ocorrência'], ['ocorrencia', 'ocorrência'], ['dano_pessoal', 'dano pessoal']];
    const calendario = h('div', { class: 'calendario', role: 'img', 'aria-label': 'Calendário de ocorrências de ' + c.mes },
      c.dias.map((status, i) => h('div', { class: 'dia ' + status, title: 'Dia ' + (i + 1) + ': ' + TEXTO_DIA[status] }, String(i + 1))));
    const esquerda = h('div', {},
      h('div', { class: 'legenda-cruz' }, legenda.map(([classe, texto]) =>
        h('span', {}, h('i', { class: 'dia ' + classe, style: 'display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-2px' }), texto))),
      calendario);
    const danosP = tabela([{ texto: 'Data' }, { texto: 'Descrição' }], c.danosPessoais.map((x) => [{ conteudo: x.data }, { conteudo: x.descricao }]));
    const danosM = tabela([{ texto: 'Data' }, { texto: 'Descrição' }], c.danosMateriais.map((x) => [{ conteudo: x.data }, { conteudo: x.descricao }]));
    return bloco({
      id: 'cruz-verde',
      kicker: '05 · Segurança operacional',
      titulo: 'Cruz Verde · ' + c.mes,
      sub: 'Um quadrado por dia do mês, com a classificação das ocorrências.',
      corpo: h('div', { class: 'grade-2' },
        esquerda,
        h('div', {},
          h('p', { class: 'rotulo-grafico' }, 'Danos pessoais'), danosP,
          h('p', { class: 'rotulo-grafico', style: 'margin-top:16px' }, 'Danos materiais'), danosM))
    });
  }

  function renderBoasPraticas(d) {
    const b = d.boasPraticas;
    return bloco({
      id: 'boas-praticas',
      kicker: '06 · Boas práticas',
      titulo: b.titulo,
      sub: b.unidade + ' · ' + b.referencia,
      corpo: h('div', { class: 'grade-kpi' },
        b.indicadores.map((x, i) => kpi({ rotulo: x.nome, valor: fmt(x.valor, 0), cor: ['vermelho', 'verde', 'amarelo', 'azul'][i % 4] })))
    });
  }

  function renderKaizen(d) {
    const k = d.kaizen;
    const atual = soma(k.unidades.map((u) => u.valor));
    const evo = ((atual - k.anterior) / k.anterior) * 100;
    const area1 = area('', 'Colunas: Kaizens acumulados por unidade');
    grafico(area1.canvas, chartKaizen(d));
    return bloco({
      id: 'kaizen',
      kicker: '07 · Kaizen',
      titulo: k.titulo,
      sub: k.periodo,
      corpo: h('div', { class: 'grade-2' },
        h('div', {}, area1.caixa),
        h('div', { class: 'kaizen-kpis' },
          kpi({ rotulo: 'Total anterior', valor: fmt(k.anterior) }),
          kpi({ rotulo: 'Total atual', valor: fmt(atual), cor: 'verde' }),
          kpi({ rotulo: 'Evolução', valor: sinal(evo, 2) + '%', cor: evo >= 0 ? 'verde' : 'vermelho' })))
    });
  }

  function renderInspecoes(d) {
    const t = d.inspecoesCruzadas;
    const statusPill = (s) => (s === 'S' ? pill('Realizado', 'ok') : s === 'N' ? pill('Não realizado', 'nok') : pill('Programado', 'prog'));
    const cabec = [{ texto: 'Período' }].concat(t.colunas.map((c) => ({ texto: c, classe: 'centro' })));
    const linhas = [
      [{ conteudo: 'Responsável pela inspeção' }].concat(t.responsavel.map((v) => ({ conteudo: v, classe: 'centro' }))),
      [{ conteudo: 'Unidade a ser inspecionada' }].concat(t.inspecionada.map((v) => ({ conteudo: v, classe: 'centro' }))),
      [{ conteudo: 'Status' }].concat(t.status.map((s) => ({ conteudo: statusPill(s), classe: 'centro' })))
    ];
    return bloco({
      id: 'inspecoes',
      kicker: '08 · Inspeções cruzadas',
      titulo: t.titulo,
      corpo: tabela(cabec, linhas)
    });
  }

  function renderCronograma(d) {
    const c = d.cronograma;
    const statusTxt = (s) => (s === 'realizado' ? pill('Realizado', 'ok') : s === 'sem_forum' ? pill('Sem fórum', 'sem') : pill('Pendente', 'prog'));
    const linhas = c.itens.map((x) => [
      { conteudo: x.mes },
      { conteudo: x.apresentador || '—' },
      { conteudo: x.unidade || '—' },
      { conteudo: statusTxt(x.status) }
    ]);
    return bloco({
      id: 'cronograma',
      kicker: '09 · Fórum 2026',
      titulo: c.titulo,
      corpo: tabela([{ texto: 'Mês' }, { texto: 'Apresentador' }, { texto: 'Unidade' }, { texto: 'Status' }], linhas)
    });
  }

  // ---------- montagem ----------
  const SECOES_NAV = [
    ['aderencia', 'Treinamentos'],
    ['vct-quantidades', 'VCT'],
    ['vct-auditorias', 'Auditorias'],
    ['desvios', 'Desvios'],
    ['gut', 'GUT'],
    ['okr', 'OKR'],
    ['flyrock', 'Flyrock'],
    ['misfire', 'Misfire'],
    ['cruz-verde', 'Cruz Verde'],
    ['boas-praticas', 'Boas práticas'],
    ['kaizen', 'Kaizen'],
    ['inspecoes', 'Inspeções'],
    ['cronograma', 'Cronograma']
  ];

  function renderNav() {
    const nav = document.getElementById('faixa-nav');
    nav.replaceChildren(...SECOES_NAV.map(([id, rotulo]) => h('a', { href: '#' + id }, rotulo)));
  }

  function renderPagina(d) {
    pendentes = [];
    document.title = d.meta.evento + ' · ' + d.meta.periodo;
    document.getElementById('aviso-dados').textContent = d.meta.aviso;
    const conteudo = [
      h('div', { class: 'cabecalho-pagina' },
        h('span', { class: 'kicker' }, d.meta.gerencia),
        h('h2', { class: 'titulo-pagina' }, 'Resumo do fórum'),
        h('p', {}, 'Referência: ' + d.meta.referencia + ' · Apresentação: ' + d.meta.periodo)),
      renderHero(d),
      renderPauta(d),
      renderAderencia(d),
      renderVctQuantidades(d),
      renderVctAuditorias(d),
      renderDesvios(d),
      renderGut(d),
      renderOkr(d),
      renderTimeline(d, 'flyrock', 'flyrock', '05 · GT Flyrock', 'Linha do tempo Flyrock'),
      renderTimeline(d, 'misfire', 'misfire', '05 · GT Misfire', 'Linha do tempo Misfire'),
      renderCruzVerde(d),
      renderBoasPraticas(d),
      renderKaizen(d),
      renderInspecoes(d),
      renderCronograma(d)
    ];
    document.getElementById('conteudo').replaceChildren(...conteudo);
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

  function ligarBotaoPptx(dados) {
    const btn = document.getElementById('btn-pptx');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Gerando…';
      try {
        await carregarPptxGenJS();
        if (typeof window.baixarApresentacao !== 'function') throw new Error('módulo de exportação ausente.');
        await window.baixarApresentacao(dados);
      } catch (e) {
        console.error(e);
        alert('Não foi possível gerar o PowerPoint: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  // ---------- início ----------
  async function iniciar() {
    const conteudo = document.getElementById('conteudo');
    let dados;
    try {
      const resp = await fetch('data/forum.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      dados = await resp.json();
    } catch (e) {
      conteudo.replaceChildren(h('p', { class: 'erro' }, 'Não foi possível carregar os dados (data/forum.json). ' + e.message));
      return;
    }
    renderPagina(dados);
    ligarBotaoPptx(dados);
  }

  iniciar();
})();
