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
    grade: 'transparent'
  };

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

  // Desvios por unidade: resolvidos (escuro) + pendentes (vermelho), empilhados na horizontal
  function chartDesviosEmpilhado(itens) {
    const ordenado = itens.slice().sort((a, b) => a.valor - b.valor).reverse();
    return {
      type: 'bar',
      data: {
        labels: ordenado.map((x) => x.nome),
        datasets: [
          {
            label: 'Resolvidos', data: ordenado.map((x) => x.resolvidos), backgroundColor: COR.ardosia, borderRadius: 0, maxBarThickness: 22,
            datalabels: { display: true, anchor: 'center', align: 'center', color: '#fff', font: { weight: '700', size: 10 }, formatter: (x) => (x ? fmt(x) : '') }
          },
          {
            label: 'Pendentes', data: ordenado.map((x) => x.pendentes), backgroundColor: COR.alerta, borderRadius: 0, maxBarThickness: 22,
            datalabels: { display: true, anchor: 'center', align: 'center', color: '#fff', font: { weight: '700', size: 10 }, formatter: (x) => (x ? fmt(x) : '') }
          }
        ]
      },
      options: configBase({
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, beginAtZero: true, grid: { color: COR.grade } },
          y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 10 } } }
        }
      })
    };
  }

  function chartResolucao(serie) {
    return {
      type: 'bar',
      data: {
        labels: serie.map((m) => m.mes),
        datasets: [{
          label: 'Resolução (%)', data: serie.map((m) => m.conclusao),
          backgroundColor: COR.ardosia, borderRadius: 2, maxBarThickness: 48,
          datalabels: { display: true, anchor: 'end', align: 'end', offset: 2, color: COR.ardosia, font: { weight: '700', size: 10 }, formatter: (v) => fmt(v, 1) + '%' }
        }]
      },
      options: configBase({
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 110, ticks: { stepSize: 20, callback: (v) => v + '%' }, grid: { color: COR.grade } },
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
      titulo: 'PAUTA',
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

  function renderDesvios(d) {
    const dv = d.desvios;
    const area1 = area('alto', 'Barras empilhadas: desvios resolvidos e pendentes por unidade');
    grafico(area1.canvas, chartDesviosEmpilhado(dv.unidades));
    return bloco({
      id: 'desvios',
      kicker: 'Lâmina 6 - Registros de desvios',
      titulo: 'Nº de desvios por gerência',
      sub: 'Desvios registrados, resolvidos e pendentes por unidade. Referência: ' + dv.referencia + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Desvios registrados no mês', valor: fmt(dv.total), cor: 'vermelho' }),
          kpi({ rotulo: 'Resolvidos', valor: fmt(dv.resolvidos) }),
          kpi({ rotulo: 'Pendentes', valor: fmt(dv.pendentes), cor: 'vermelho' }),
          kpi({ rotulo: 'Índice de resolução', valor: pct(dv.indice, 1), sub: 'resolvidos ÷ registrados' })),
        area1.caixa)
    });
  }

  function renderIndicadores(d) {
    const dv = d.desvios;
    const ad = d.aderencia;
    const mediaAd = media(ad.unidades.map((u) => u.valor));
    const i = d.inspecoes;
    const planejadoVct = soma(d.vct.unidades.map((u) => u.planejado));
    const realVct = soma(d.vct.unidades.map((u) => u.tecnicos + u.liderança));
    const linhas = [
      ['Resolução de desvios (resolvidos ÷ registrados)', '%', 'não consta na planilha', dv.referencia, pct(dv.indice, 1)],
      ['Aderência de treinamentos obrigatórios (média)', '%', pct(ad.meta, 0), ad.referencia, pct(mediaAd, 2)]
    ];
    if (i) linhas.push(['Inspeções TST: unidades abaixo da meta', 'UN', (i.meta !== null ? fmt(i.meta) + ' inspeções por unidade' : 'varia por unidade'), i.referencia, i.abaixo.length + ' de ' + i.unidades.length]);
    linhas.push(['VCT: quantidade realizada (técnicos + liderança)', 'QTD', 'planejado: ' + fmt(planejadoVct), d.vct.referencia, fmt(realVct)]);
    const area1 = area('baixo', 'Gráfico de colunas: resolução mensal de desvios em porcentagem');
    grafico(area1.canvas, chartResolucao(dv.serie));
    return bloco({
      id: 'indicadores',
      kicker: 'Lâmina 7 - Indicadores de desvios e planos de ação',
      titulo: 'Indicadores de desvios e planos de ação',
      sub: 'Valores registrados na planilha, com a referência de cada indicador.',
      corpo: h('div', {},
        h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela' },
          h('thead', {}, h('tr', {}, ['Indicador', 'UN', 'Meta (planilha)', 'Referência', 'Resultado'].map((c) => h('th', {}, c)))),
          h('tbody', {}, linhas.map((r) => h('tr', {}, r.map((v) => h('td', {}, v)))))
        )),
        h('p', { class: 'legenda-manual', style: 'margin-top:22px' }, 'Resolução mensal de desvios (resolvidos ÷ registrados)'),
        area1.caixa)
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
    ['desvios', 'Desvios'],
    ['indicadores', 'Indicadores']
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
      renderDesvios(d),
      renderIndicadores(d)
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
    const gd = abaDe(wb, 'desvios');
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
    const desvios = {
      referencia: MESES_NOME[mesDesv] + ' ' + anoDesv,
      unidades: unidadesDesv,
      total: totalDesv,
      resolvidos: resolvidosDesv,
      pendentes: totalDesv - resolvidosDesv,
      indice: totalDesv ? arred1(resolvidosDesv / totalDesv * 100) : 0,
      serie: serieDesv
    };

    // Inspeções Mensais de Segurança (TST): Meta (QTD) e Executado (QTD) por unidade; mês = último com execução lançada
    const ins = abaDe(wb, 'inspecoes').slice(1).filter((r) => r && nomeLimpo(r[2]) && numero(r[4]) !== null);
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
