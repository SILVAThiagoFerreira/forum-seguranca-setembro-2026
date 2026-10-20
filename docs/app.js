(function () {
  'use strict';

  // Paleta do site (Enaex): ardósia da capa + vermelho da marca + tons das lâminas clean
  const COR = {
    ok: '#3d4248',
    alerta: '#e30613',
    amarelo: '#e2b4b8',
    vermelho: '#b5121b',
    ardosia: '#3d4248',
    cinza: '#8b9096',
    cinzaClaro: '#c4c8cc',
    azul: '#8b9096',
    grade: 'transparent'
  };

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

  // ---------- seções ----------
  function renderHero(d) {
    const ader = d.aderencia.unidades;
    const mediaAder = media(ader.map((u) => u.valor));
    const naMeta = ader.filter((u) => u.valor >= d.aderencia.meta).length;
    const realizado = soma(d.vct.quantidades.unidades.map((u) => u.tecnicos + u.supervisores));
    const planejado = soma(d.vct.quantidades.unidades.map((u) => u.planejado));
    const variacaoVct = planejado ? ((realizado - planejado) / planejado) * 100 : 0;
    const dv = d.desvios;
    const totalDesvios = soma(dv.porGerencia.map((x) => x.valor));
    const resolvidos = dv.porSituacao[0].valor;
    const pendentes = dv.porSituacao[1].valor;
    const ins = d.inspecoes;
    const metaIns = soma(ins.unidades.map((u) => u.meta));
    const execIns = soma(ins.unidades.map((u) => u.executado));
    const resIns = metaIns ? (execIns / metaIns) * 100 : 0;
    return h('section', { class: 'kpis', 'aria-label': 'Indicadores principais' },
      kpi({ rotulo: 'Aderência média', valor: pct(mediaAder), sub: naMeta + ' de ' + ader.length + ' unidades na meta de ' + d.aderencia.meta + '%', cor: naMeta === ader.length ? 'verde' : 'vermelho' }),
      kpi({ rotulo: 'VCT realizadas', valor: realizado + '/' + planejado, sub: 'variação ' + sinal(variacaoVct) + '% vs. planejado', cor: variacaoVct < 0 ? 'vermelho' : 'verde' }),
      kpi({ rotulo: 'Desvios no mês', valor: fmt(dv.mes), sub: dv.mesReferencia, cor: 'amarelo' }),
      kpi({ rotulo: 'Desvios pendentes', valor: fmt(pendentes), sub: 'de ' + fmt(totalDesvios) + ' registrados no período', cor: pendentes ? 'vermelho' : 'verde' }),
      kpi({ rotulo: 'Desvios resolvidos', valor: fmt(resolvidos), sub: pct(totalDesvios ? (resolvidos / totalDesvios) * 100 : 0, 0) + ' dos registrados', cor: 'verde' }),
      kpi({ rotulo: 'Inspeções no mês', valor: fmt(execIns) + '/' + fmt(metaIns), sub: pct(resIns, 0) + ' da meta · ' + ins.referencia, cor: resIns >= 100 ? 'verde' : 'vermelho' }));
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
      sub: a.subtitulo + ' Referência: ' + a.referencia + '.',
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Meta', valor: pct(a.meta, 0), cor: '' }),
          kpi({ rotulo: 'Unidades na meta', valor: atingiram + ' de ' + a.unidades.length, cor: 'verde' }),
          kpi({ rotulo: 'Abaixo da meta', valor: abaixo.length ? abaixo.join(', ') : 'nenhuma', cor: abaixo.length ? 'vermelho' : 'verde' })),
        area1.caixa,
        h('p', { class: 'legenda-manual' },
          h('i', { style: 'background:' + COR.ok }), 'atingiu a meta',
          h('i', { style: 'background:' + COR.vermelho }), 'abaixo da meta',
          h('i', { style: 'background:' + COR.ardosia }), 'linha tracejada = meta de ' + a.meta + '%'))
    });
  }

  function renderVctQuantidades(d) {
    const q = d.vct.quantidades;
    const tec = soma(q.unidades.map((u) => u.tecnicos));
    const sup = soma(q.unidades.map((u) => u.supervisores));
    const real = tec + sup;
    const plan = soma(q.unidades.map((u) => u.planejado));
    const variacao = plan ? ((real - plan) / plan) * 100 : 0;
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
    const com = a.unidades.filter((u) => u.resultado !== null);
    const resultadoMedio = com.length ? media(com.map((u) => u.resultado)) : 0;
    const naoConformes = soma(a.unidades.map((u) => u.naoConformes));
    const cem = com.filter((u) => u.resultado >= 100).length;
    const linhas = a.unidades.map((u) => [
      { conteudo: u.nome },
      { conteudo: u.resultado === null ? '—' : pct(u.resultado, 0), classe: 'num' },
      { conteudo: fmt(u.naoConformes), classe: 'num' }
    ]);
    return bloco({
      id: 'vct-auditorias',
      kicker: '02 · Verificação do ciclo do trabalho (VCT)',
      titulo: a.titulo,
      sub: 'Referência: ' + a.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Resultado médio', valor: pct(resultadoMedio, 0), cor: resultadoMedio >= 100 ? 'verde' : 'vermelho' }),
          kpi({ rotulo: 'Itens não conformes', valor: fmt(naoConformes), cor: naoConformes ? 'vermelho' : 'verde' }),
          kpi({ rotulo: 'Unidades com 100%', valor: cem + ' de ' + com.length, cor: cem === com.length ? 'verde' : '' })),
        tabela([
          { texto: 'Unidade' },
          { texto: 'Resultado médio', classe: 'num' },
          { texto: 'Itens não conformes', classe: 'num' }
        ], linhas))
    });
  }

  function renderDesvios(d) {
    const ger = d.desvios.porGerencia;
    const sit = d.desvios.porSituacao;
    const total = soma(ger.map((x) => x.valor));
    const resolvidos = sit[0].valor;
    const pendentes = sit[1].valor;
    const areaGer = area('alto', 'Barras horizontais: desvios por gerência');
    const areaSit = area('baixo', 'Barras horizontais: desvios resolvidos e pendentes');
    grafico(areaGer.canvas, chartBarrasHorizontais(ger, COR.ardosia));
    grafico(areaSit.canvas, chartBarrasHorizontais(sit, COR.vermelho));
    return bloco({
      id: 'desvios',
      kicker: '03 · Registros de desvios',
      titulo: d.desvios.titulo,
      sub: 'Referência: ' + d.desvios.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Total de desvios', valor: fmt(total), cor: 'vermelho' }),
          kpi({ rotulo: 'Resolvidos', valor: fmt(resolvidos), sub: pct(total ? (resolvidos / total) * 100 : 0, 0), cor: 'verde' }),
          kpi({ rotulo: 'Pendentes', valor: fmt(pendentes), sub: pct(total ? (pendentes / total) * 100 : 0, 0), cor: pendentes ? 'amarelo' : 'verde' })),
        h('div', { class: 'grade-2' },
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Por gerência'), areaGer.caixa),
          h('div', {}, h('p', { class: 'rotulo-grafico' }, 'Por situação'), areaSit.caixa)))
    });
  }

  function renderInspecoes(d) {
    const t = d.inspecoes;
    const metaTotal = soma(t.unidades.map((u) => u.meta));
    const execTotal = soma(t.unidades.map((u) => u.executado));
    const resultado = metaTotal ? (execTotal / metaTotal) * 100 : 0;
    const linhas = t.unidades.map((u) => [
      { conteudo: u.nome },
      { conteudo: fmt(u.meta), classe: 'num' },
      { conteudo: fmt(u.executado), classe: 'num' },
      { conteudo: pct(u.resultado, 0), classe: 'num' },
      { conteudo: sinal(u.resultado - 100, 0) + '%', classe: 'num' }
    ]);
    const rodape = [
      { conteudo: 'Total' },
      { conteudo: fmt(metaTotal), classe: 'num' },
      { conteudo: fmt(execTotal), classe: 'num' },
      { conteudo: pct(resultado, 0), classe: 'num' },
      { conteudo: sinal(resultado - 100, 0) + '%', classe: 'num' }
    ];
    return bloco({
      id: 'inspecoes',
      kicker: '04 · Inspeções mensais de segurança',
      titulo: t.titulo,
      sub: 'Referência: ' + t.referencia,
      corpo: h('div', {},
        h('div', { class: 'grade-kpi' },
          kpi({ rotulo: 'Meta (QTD)', valor: fmt(metaTotal) }),
          kpi({ rotulo: 'Executado (QTD)', valor: fmt(execTotal), cor: 'verde' }),
          kpi({ rotulo: 'Resultado', valor: pct(resultado, 0), cor: resultado >= 100 ? 'verde' : 'vermelho' })),
        tabela([
          { texto: 'Unidade de serviço' },
          { texto: 'Meta (QTD)', classe: 'num' },
          { texto: 'Executado (QTD)', classe: 'num' },
          { texto: 'Resultado', classe: 'num' },
          { texto: 'Variação', classe: 'num' }
        ], linhas, rodape))
    });
  }

  // ---------- montagem ----------
  const SECOES_NAV = [
    ['aderencia', 'Treinamentos'],
    ['vct-quantidades', 'VCT'],
    ['vct-auditorias', 'Auditorias'],
    ['desvios', 'Desvios'],
    ['inspecoes', 'Inspeções']
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
      renderInspecoes(d)
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
  const arred2 = (x) => Math.round(x * 100) / 100;
  function numero(v) {
    if (typeof v === 'number') return isNaN(v) ? null : v;
    if (v == null || String(v).trim() === '') return null;
    const n = Number(String(v).trim().replace(',', '.'));
    return isNaN(n) ? null : n;
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
    const ultAd = resultados[resultados.length - 1];
    const metaAd = numero(ultAd[2]);
    const aderencia = {
      titulo: 'Aderência por unidade (%)',
      subtitulo: 'Treinamentos obrigatórios por unidade.',
      referencia: MESES_NOME[mesIdx(ultAd[1])] + ' ' + ultAd[0],
      meta: metaAd <= 1 ? arred2(metaAd * 100) : metaAd,
      unidades: colsUnidades.filter((i) => numero(ultAd[i]) !== null)
        .map((i) => ({ nome: nomeLimpo(ad[0][i]), valor: arred2(numero(ultAd[i]) * 100) }))
    };

    // VCT: uma linha por unidade e tipo; colunas de mês a partir da E; mês de referência = último mês preenchido
    const vc = abaDe(wb, 'vct');
    const colsMesVct = [];
    for (let i = 4; i < vc[0].length; i++) {
      const m = mesIdx(vc[0][i]);
      if (m >= 0) colsMesVct.push({ col: i, mes: m });
    }
    const linhasVct = vc.slice(1).filter((r) => r && nomeLimpo(r[1]) && r[2]);
    const mesVct = Math.max(...linhasVct.flatMap((r) => colsMesVct.filter((c) => numero(r[c.col]) !== null).map((c) => c.mes)));
    const colVct = colsMesVct.find((c) => c.mes === mesVct).col;
    const anoVct = linhasVct[0][0];
    const unidadesVct = [...new Set(linhasVct.map((r) => nomeLimpo(r[1])))];
    const achar = (u, tipo) => linhasVct.find((r) => nomeLimpo(r[1]) === u && norm(r[2]).startsWith(tipo));
    const valorVct = (r) => (r ? numero(r[colVct]) : null);
    const planoVct = (r) => (r ? numero(r[3]) || 0 : 0);
    const refVct = MESES_NOME[mesVct] + ' ' + anoVct;
    const vct = {
      quantidades: {
        titulo: 'Quantidades realizadas por unidade',
        referencia: refVct,
        unidades: unidadesVct.map((u) => {
          const tec = achar(u, 'tecnico');
          const lid = achar(u, 'lideranca');
          return { nome: u, tecnicos: valorVct(tec) || 0, supervisores: valorVct(lid) || 0, planejado: planoVct(tec) + planoVct(lid) };
        })
      },
      auditorias: {
        titulo: 'Resultados das auditorias VCT',
        referencia: refVct,
        unidades: unidadesVct.map((u) => {
          const res = valorVct(achar(u, 'resultat'));
          return { nome: u, resultado: res === null ? null : arred2(res * 100), naoConformes: valorVct(achar(u, 'itens')) || 0 };
        })
      }
    };

    // Gestão de Desvios: linhas Desvios / Resolvidos / Pendentes por unidade; meses a partir da D
    const gd = abaDe(wb, 'desvios');
    const colsMesDesv = [];
    for (let i = 3; i < gd[0].length; i++) {
      const m = mesIdx(gd[0][i]);
      if (m >= 0) colsMesDesv.push({ col: i, mes: m });
    }
    const linhasDesv = gd.slice(1).filter((r) => r && nomeLimpo(r[0]) && norm(r[1]));
    const mesDesv = Math.max(...linhasDesv.filter((r) => norm(r[1]) === 'desvios')
      .flatMap((r) => colsMesDesv.filter((c) => numero(r[c.col]) !== null).map((c) => c.mes)));
    const anoDesv = String(linhasDesv[0][2]).trim();
    const colMesDesv = colsMesDesv.find((c) => c.mes === mesDesv).col;
    const unidadesDesv = [...new Set(linhasDesv.map((r) => nomeLimpo(r[0])))];
    const linhaDesv = (u, tipo) => linhasDesv.find((r) => nomeLimpo(r[0]) === u && norm(r[1]) === tipo);
    const somaAte = (r) => (r ? colsMesDesv.filter((c) => c.mes <= mesDesv).reduce((s, c) => s + (numero(r[c.col]) || 0), 0) : 0);
    const porGerencia = unidadesDesv.map((u) => ({ nome: u, valor: somaAte(linhaDesv(u, 'desvios')) }));
    const somaTipo = (tipo) => unidadesDesv.reduce((s, u) => s + somaAte(linhaDesv(u, tipo)), 0);
    const desvios = {
      titulo: 'Nº de desvios por gerência e situação',
      referencia: 'Janeiro a ' + MESES_NOME[mesDesv] + ' de ' + anoDesv,
      mesReferencia: MESES_NOME[mesDesv] + ' ' + anoDesv,
      mes: soma(unidadesDesv.map((u) => { const r = linhaDesv(u, 'desvios'); return r ? numero(r[colMesDesv]) || 0 : 0; })),
      porGerencia: porGerencia,
      porSituacao: [{ nome: 'Resolvidos', valor: somaTipo('resolvidos') }, { nome: 'Pendentes', valor: somaTipo('pendentes') }]
    };

    // Inspeções mensais: Meta e Executado por unidade no último mês com execução preenchida
    const ins = abaDe(wb, 'inspecoes');
    const linhasIns = ins.slice(1).filter((r) => r && nomeLimpo(r[2]));
    const mesIns = Math.max(...linhasIns.filter((r) => numero(r[4]) !== null).map((r) => mesIdx(r[1])));
    const anoIns = String(linhasIns[0][0]).trim();
    const inspecoes = {
      titulo: 'Inspeções mensais de segurança · ' + MESES_NOME[mesIns],
      referencia: MESES_NOME[mesIns] + ' ' + anoIns,
      unidades: linhasIns.filter((r) => mesIdx(r[1]) === mesIns).map((r) => {
        const meta = numero(r[3]) || 0;
        const exec = numero(r[4]) || 0;
        return { nome: nomeLimpo(r[2]), meta: meta, executado: exec, resultado: meta ? arred2((exec / meta) * 100) : 0 };
      })
    };

    const dados = {
      meta: {
        evento: EVENTO,
        gerencia: GERENCIA,
        periodo: periodo,
        referencia: desvios.mesReferencia,
        aviso: 'Fonte: planilha "KPI’s Segurança do Trabalho" no Google Drive.'
      },
      pauta: pauta,
      aderencia: aderencia,
      vct: vct,
      desvios: desvios,
      inspecoes: inspecoes
    };
    if (!dados.pauta.length || !dados.aderencia.unidades.length || !dados.vct.quantidades.unidades.length || !dados.desvios.porGerencia.length || !dados.inspecoes.unidades.length) {
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
    ligarBotaoPptx(dados);
  }

  iniciar();
})();
