(function () {
  'use strict';

  // Exportação no padrão visual das lâminas de referência (US Vale Verde): fundo branco,
  // título vermelho e uma única linha escura ("Strictly private") acima do rodapé.
  // Medidas extraídas do PPTX de referência: página 13,333 x 8,527 pol.
  // A mesma descrição de lâminas alimenta o PowerPoint (pptxgenjs) e o PDF (palco HTML + jsPDF).
  var C = {
    branco: 'FFFFFF', vermelho: 'B5121B', escuro: '3E4349', texto: '3E4349',
    medio: '8A9098', linha: 'C4C8CD', rosa: 'E3B5B9', cinza: '8A9098',
    ardosia: '3D4248', alerta: 'B5121B', claro: 'C3C6CB', verde: '1E7A46', amareloGut: 'E8B400'
  };
  // Tamanhos de fonte em pontos (reduzidos em relação à versão anterior)
  var T = {
    titulo: 15, tituloDestaque: 28, subtitulo: 10, secao: 13, texto: 11.5, pauta: 15,
    indicadorRotulo: 10.5, indicadorValor: 22, indicadorSub: 9,
    tabela: 10.5, eixo: 10, rotulo: 9.5, legenda: 10, rodape: 8
  };
  var FONT = 'Arial';
  var LAYOUT = 'REFERENCIA';
  var PAG_W = 13.333, PAG_H = 8.527;
  var X0 = 0.45, W = 12.433;
  var POL = 96;       // pixels por polegada no palco HTML (usado só no PDF)
  var PT = POL / 72;  // pixels por ponto

  function soma(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }
  function num(v, casas) { return Number(v).toFixed(casas || 0).replace('.', ','); }
  function sinal(v, casas) { return (v > 0 ? '+' : '') + num(v, casas) + '%'; }

  function buscarImagem(url) {
    return fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
      return new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { res(fr.result); };
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
    });
  }

  function obterLogos(opcoes) {
    opcoes = opcoes || {};
    var enaex = opcoes.logoEnaex ? Promise.resolve(opcoes.logoEnaex) : buscarImagem('assets/enaex-referencia.png');
    return enaex.then(function (dados) { return { enaex: dados }; });
  }

  function texto(s, t, x, y, w, h, o) {
    var op = { x: x, y: y, w: w, h: h, fontFace: FONT, fontSize: T.texto, color: C.texto, margin: 0, valign: 'top' };
    for (var k in o) op[k] = o[k];
    s.addText(t, op);
  }

  // Cabeçalho: título vermelho, subtítulo cinza-escuro, logo Enaex à direita.
  // Rodapé: apenas a linha principal escura e "STRICTLY PRIVATE AND CONFIDENTIAL" à direita.
  function lamina(pptx, ctx, o) {
    var s = pptx.addSlide();
    s.background = { color: C.branco };
    ctx.slides.push(s);
    var titulo = String(o.titulo || '').toLocaleUpperCase('pt-BR');
    if (o.destaque) {
      // Lâmina de pauta: traço vermelho acima do título grande
      s.addShape('rect', { x: X0, y: 1.8, w: 1.1, h: 0.06, fill: { color: C.vermelho }, line: { type: 'none' } });
      texto(s, titulo, X0, 1.98, 9.0, 0.6, { fontSize: T.tituloDestaque, bold: true, color: C.escuro });
      if (o.sub) texto(s, o.sub, X0, 2.62, 10.0, 0.3, { fontSize: T.subtitulo, color: C.texto });
    } else {
      texto(s, titulo, X0, 0.5, 9.0, 0.42, { fontSize: T.titulo, color: C.vermelho });
      texto(s, o.sub || '', X0, 0.93, 10.0, 0.3, { fontSize: T.subtitulo, color: C.texto });
    }
    if (o.secao) texto(s, o.secao, X0, 1.62, W, 0.3, { fontSize: T.secao, color: C.texto });
    s.addShape('rect', { x: X0, y: 7.98, w: W, h: 0.02, fill: { color: C.escuro }, line: { type: 'none' } });
    texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 8.1, W, 0.2, { fontSize: T.rodape, color: C.escuro, align: 'right' });
    return s;
  }

  // Indicadores sem cartões: valor grande, rótulo e detalhe, alinhados à esquerda.
  function indicadores(s, y, itens) {
    var colW = W / itens.length;
    itens.forEach(function (c, i) {
      var x = X0 + i * colW;
      texto(s, c.rotulo, x, y, colW - 0.2, 0.25, { fontSize: T.indicadorRotulo, color: C.texto });
      texto(s, String(c.valor), x, y + 0.27, colW - 0.2, 0.5, { fontSize: T.indicadorValor, bold: true, color: c.cor || C.escuro });
      if (c.sub) texto(s, c.sub, x, y + 0.8, colW - 0.2, 0.25, { fontSize: T.indicadorSub, color: C.medio });
    });
  }

  // Gráficos: sem grade, sem eixo de valores, eixo de categorias em cinza-claro, rótulos em negrito.
  function opcChart(extra) {
    var o = {
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: T.eixo, catAxisLabelColor: C.escuro,
      catAxisLineShow: true, catAxisLineColor: C.linha, catAxisLineSize: 1,
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showLegend: false, legendFontFace: FONT, legendFontSize: T.legenda, legendColor: C.escuro,
      showValue: true, dataLabelFontFace: FONT, dataLabelFontBold: true, dataLabelFontSize: T.rotulo,
      dataLabelColor: C.escuro, dataLabelPosition: 'outEnd', barGapWidthPct: 60
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  function complemento(pptx, ctx, p) {
    var s = lamina(pptx, ctx, { titulo: p.titulo, sub: p.referencia || '',
      secao: p.secao || 'Resultados por unidade:' });
    if (p.linhas && p.linhas.length) {
      var rows = [p.colunas].concat(p.linhas.map(function (r) { return r.map(function (v) { return v == null ? 'Sem dados' : String(v); }); }));
      var larg0 = W * 0.4;
      var largDemais = (W - larg0) / (p.colunas.length - 1);
      var colW = [larg0].concat(p.colunas.slice(1).map(function () { return largDemais; }));
      s.addTable(rows.map(function (r, i) {
        return r.map(function (c) {
          return { text: c, options: { bold: i === 0, color: C.escuro, fontSize: T.tabela } };
        });
      }), { x: X0, y: 2.15, w: W, colW: colW, fontFace: FONT, margin: [0.03, 0.05, 0.03, 0.05],
        border: { type: 'none' }, rowH: 0.32, autoPage: false });
      texto(s, p.nota, X0, 7.02, W, 0.8, { fontSize: T.texto, align: 'justify' });
    }
  }

  // ---------- ícones das lâminas (PNG gerado em canvas: serve ao PowerPoint, ao PDF e à prévia) ----------
  var iconesCache = {};
  function icone(tipo, cor) {
    cor = String(cor).replace('#', ''); // aceita "B5121B" (lâminas) ou "#b5121b" (prévia)
    var chave = tipo + '-' + cor;
    if (iconesCache[chave]) return iconesCache[chave];
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    var g = cv.getContext('2d');
    var c = '#' + cor, branco = '#FFFFFF';
    g.lineCap = 'round'; g.lineJoin = 'round';
    function disco(cor2) { g.fillStyle = cor2; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill(); }
    if (tipo === 'calendario') {
      disco(c);
      g.strokeStyle = branco; g.fillStyle = branco; g.lineWidth = 14;
      g.strokeRect(64, 84, 128, 108);
      g.beginPath(); g.moveTo(64, 120); g.lineTo(192, 120); g.stroke();
      g.beginPath(); g.moveTo(96, 62); g.lineTo(96, 96); g.moveTo(160, 62); g.lineTo(160, 96); g.stroke();
      [[96, 150], [128, 150], [160, 150], [96, 174], [128, 174], [160, 174]].forEach(function (p) {
        g.beginPath(); g.arc(p[0], p[1], 8, 0, Math.PI * 2); g.fill();
      });
    } else if (tipo === 'check') {
      g.strokeStyle = c; g.lineWidth = 34;
      g.beginPath(); g.moveTo(36, 134); g.lineTo(100, 196); g.lineTo(222, 66); g.stroke();
    } else if (tipo === 'proibido') {
      g.strokeStyle = c; g.lineWidth = 26;
      g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(62, 194); g.lineTo(194, 62); g.stroke();
    } else if (tipo === 'seta') {
      disco(c);
      g.strokeStyle = branco; g.lineWidth = 26;
      g.beginPath(); g.moveTo(128, 190); g.lineTo(128, 72); g.stroke();
      g.beginPath(); g.moveTo(82, 118); g.lineTo(128, 72); g.lineTo(174, 118); g.stroke();
    }
    var url = cv.toDataURL('image/png');
    iconesCache[chave] = url;
    return url;
  }

  // Classes da GUT (como na referência): Baixa = GUT 3 a 6; Média = 7 a 11; Alta = 12 a 15
  function classeGut(n) { return n <= 6 ? 'baixa' : (n <= 11 ? 'media' : 'alta'); }

  // Gráfico de barras. Séries com linha: true viram linha de meta (barra + linha no PowerPoint).
  function addGrafico(s, ctx, series, o) {
    var linhas = series.filter(function (x) { return x.linha; });
    if (ctx.palco || !linhas.length) return s.addChart('bar', series, o);
    var barras = series.filter(function (x) { return !x.linha; });
    var pura = function (lista) { return lista.map(function (x) { return { name: x.name, labels: x.labels, values: x.values }; }); };
    return s.addChart([
      { type: 'bar', data: pura(barras), options: { chartColors: barras.map(function (x) { return x.cor; }) } },
      { type: 'line', data: pura(linhas), options: { chartColors: linhas.map(function (x) { return x.cor; }), lineSize: 2, lineDash: 'dash', lineDataSymbol: 'none', showValue: false } }
    ], o);
  }

  // Nº desvios por GUT: cartões por classe (baixa verde, média amarela, alta vermelha) e total; gráfico por valor de GUT
  function laminaGut(pptx, ctx, d) {
    var g = d.gut;
    var total = g.classes.baixa + g.classes.media + g.classes.alta;
    var s = lamina(pptx, ctx, { titulo: 'Nº desvios por GUT', sub: 'Dados referentes ao mês de ' + g.periodo + '.' });
    var parteTotal = function (v) { return num(total ? (v / total) * 100 : 0, 1) + '% do total'; };
    var cards = [
      { rotulo: 'GUT baixa', valor: g.classes.baixa, cor: C.verde, corValor: C.verde, sub: parteTotal(g.classes.baixa) },
      { rotulo: 'GUT média', valor: g.classes.media, cor: C.amareloGut, corValor: 'B58A00', sub: parteTotal(g.classes.media) },
      { rotulo: 'GUT alta', valor: g.classes.alta, cor: C.vermelho, corValor: C.vermelho, sub: parteTotal(g.classes.alta) },
      { rotulo: 'Total de desvios', valor: total, cor: C.ardosia, corValor: C.escuro, sub: '100% · ' + g.periodo }
    ];
    var cw = (W - 0.6) / 4, hh = 1.3, yCard = 1.72;
    cards.forEach(function (c, i) {
      var x = X0 + i * (cw + 0.2);
      s.addShape('roundRect', { x: x, y: yCard, w: cw, h: hh, fill: { color: C.branco }, line: { color: 'D9DCE1', width: 0.75 }, rectRadius: 0.1 });
      s.addShape('rect', { x: x, y: yCard + 0.2, w: 0.05, h: hh - 0.4, fill: { color: c.cor }, line: { type: 'none' } });
      s.addShape('ellipse', { x: x + 0.3, y: yCard + 0.2, w: 0.13, h: 0.13, fill: { color: c.cor }, line: { type: 'none' } });
      texto(s, c.rotulo.toLocaleUpperCase('pt-BR'), x + 0.52, yCard + 0.16, cw - 0.7, 0.25, { fontSize: T.indicadorRotulo, color: C.medio, bold: true });
      texto(s, String(c.valor), x + 0.3, yCard + 0.42, cw - 0.5, 0.5, { fontSize: 30, bold: true, color: c.corValor });
      texto(s, c.sub, x + 0.3, yCard + 0.94, cw - 0.5, 0.22, { fontSize: T.indicadorSub, color: C.medio });
    });

    texto(s, 'Quantidade de desvios por valor de GUT', X0, 3.27, W, 0.3, { fontSize: T.secao, color: C.texto });
    var guts = g.porGut.map(function (x) { return String(x.gut); });
    var porClasse = function (cl) { return g.porGut.map(function (x) { return classeGut(x.gut) === cl ? x.valor : 0; }); };
    addGrafico(s, ctx, [
      { name: 'GUT baixa (3 a 6)', labels: guts, values: porClasse('baixa'), cor: C.verde },
      { name: 'GUT média (7 a 11)', labels: guts, values: porClasse('media'), cor: C.amareloGut },
      { name: 'GUT alta (12 a 15)', labels: guts, values: porClasse('alta'), cor: C.vermelho }
    ], opcChart({ x: X0, y: 3.6, w: W, h: 4.3, chartColors: [C.verde, C.amareloGut, C.vermelho], showLegend: true, legendPos: 'b',
      dataLabelFormatCode: '0;-0;;', dataLabelPosition: 'outEnd', dataLabelFontSize: 10, catAxisLabelFontSize: 10, barGapWidthPct: 35 }));
    return s;
  }

  // OKR 2026 - detalhamento por unidade: conclusão mensal (resolvidos ÷ registrados); abaixo da meta em vermelho suave
  function laminaOkrUnidades(pptx, ctx, d) {
    var k = d.okr, c = d.desvios.conclusaoUnidades;
    var s = lamina(pptx, ctx, { titulo: 'OKR 2026 - detalhamento por unidade',
      sub: 'Conclusão mensal dos planos de ação por unidade de serviço (%). Meta: ' + k.appropriated + '%.' });
    var abaixo = function (v) { return v !== null && v < k.appropriated; };
    var celula = function (v, negrito, fundo) {
      var op = { align: 'center', color: C.escuro, fontSize: 10.5, bold: !!negrito };
      if (fundo) op.fill = { color: fundo };
      if (abaixo(v)) { op.fill = { color: 'F8E1E3' }; op.color = C.vermelho; }
      return { text: v === null ? '–' : num(v, 1) + '%', options: op };
    };
    var cab = [{ text: 'Unidade de serviço', options: { bold: true, color: C.branco, fill: { color: C.ardosia }, fontSize: 10.5 } }]
      .concat(c.meses.map(function (m) { return { text: m, options: { bold: true, color: C.branco, fill: { color: C.ardosia }, align: 'center', fontSize: 10.5 } }; }));
    var linhas = [cab].concat(c.linhas.map(function (l) {
      return [{ text: l.nome, options: { color: C.escuro, fontSize: 10.5 } }].concat(l.valores.map(function (v) { return celula(v); }));
    }));
    linhas.push([{ text: 'Total (todas as unidades)', options: { bold: true, color: C.escuro, fill: { color: 'EDEFF2' }, fontSize: 10.5 } }]
      .concat(c.total.map(function (v) { return celula(v, true, 'EDEFF2'); })));
    var larg0 = 3.2, largMes = (W - larg0) / c.meses.length;
    s.addTable(linhas, { x: X0, y: 1.8, w: W, colW: [larg0].concat(c.meses.map(function () { return largMes; })),
      fontFace: FONT, margin: [0.03, 0.05, 0.03, 0.05], border: { type: 'none' }, rowH: 0.36, autoPage: false });
    texto(s, 'Vermelho: abaixo da meta de ' + k.appropriated + '%. "–": sem desvios registrados no mês.', X0, 7.02, W, 0.5, { fontSize: T.texto });
    return s;
  }

  // OKR 2026: tabela de metas (Gate, Appropriated, Exceeded) e barras mensais com linha de meta
  function laminaOkr(pptx, ctx, d) {
    var k = d.okr;
    var s = lamina(pptx, ctx, { titulo: 'OKR 2026 - promover a segurança', sub: 'Gerência Mineração - Underground/Nordeste' });
    var colunas = [
      { t: 'KPI', w: 5.333 }, { t: 'UN', w: 1.2 }, { t: 'Gate', w: 1.9 }, { t: 'Appropriated', w: 2.0 }, { t: 'Exceeded', w: 2.0 }
    ];
    var xs = [], acc = X0;
    colunas.forEach(function (c) { xs.push(acc); acc += c.w; });
    var y0 = 1.72, cabH = 0.42, corpoH = 0.86, yb = y0 + cabH;
    s.addShape('rect', { x: X0, y: y0, w: W, h: cabH, fill: { color: C.ardosia }, line: { type: 'none' } });
    colunas.forEach(function (c, i) {
      texto(s, c.t, xs[i] + 0.1, y0 + 0.1, c.w - 0.2, 0.25, { fontSize: 12, bold: true, color: C.branco, align: 'center' });
    });
    s.addShape('rect', { x: X0, y: yb, w: W, h: corpoH, fill: { color: 'F3F4F6' }, line: { type: 'none' } });
    texto(s, [
      { text: k.kpi, options: { color: C.escuro, breakLine: true } },
      { text: k.kpiDetalhe, options: { color: C.vermelho } }
    ], xs[0] + 0.1, yb + 0.16, colunas[0].w - 0.2, 0.6, { fontSize: 12, align: 'center' });
    [k.un, k.gate + '%', k.appropriated + '%', k.exceeded + '%'].forEach(function (v, i) {
      texto(s, v, xs[i + 1] + 0.1, yb + 0.3, colunas[i + 1].w - 0.2, 0.3, { fontSize: 14, align: 'center', color: C.escuro });
    });

    texto(s, 'Conclusão mensal dos planos de ação (%):', X0, 3.25, W, 0.3, { fontSize: T.secao, color: C.texto });
    var meses = k.serie.map(function (m) { return m.mes; });
    addGrafico(s, ctx, [
      { name: 'Conclusão mensal (%)', labels: meses, values: k.serie.map(function (m) { return m.valor; }), cor: C.ardosia },
      { name: 'Appropriated (' + k.appropriated + '%)', labels: meses, values: meses.map(function () { return k.appropriated; }), linha: true, cor: C.vermelho }
    ], opcChart({ x: X0, y: 3.6, w: W, h: 4.25, chartColors: [C.ardosia], showLegend: true, legendPos: 'b',
      valAxisMinVal: 0, valAxisMaxVal: 110, valAxisLabelFormatCode: '0"%"', dataLabelFormatCode: '0"%"',
      dataLabelPosition: 'outEnd', barGapWidthPct: 60 }));
    return s;
  }

  // Cronograma de apresentação: duas colunas de linhas com ícone de calendário e status
  function laminaCronograma(pptx, ctx, d) {
    var s = lamina(pptx, ctx, { titulo: 'Cronograma - apresentação', sub: 'Safety Share' });
    var itens = d.cronograma;
    var metade = Math.floor(itens.length / 2);
    var colW = 6.1, pitch = 0.78, alt = 0.66;
    [itens.slice(0, metade), itens.slice(metade)].forEach(function (col, c) {
      var x = X0 + c * (colW + 0.233);
      col.forEach(function (it, j) {
        var y = 1.95 + j * pitch;
        s.addShape('rect', { x: x, y: y, w: colW, h: alt, fill: { color: 'F3F4F6' }, line: { type: 'none' } });
        s.addImage({ data: icone('calendario', C.verde), x: x + 0.1, y: y + 0.08, w: 0.5, h: 0.5 });
        var partes = [{ text: it.mes + ' ' + it.ano, options: { bold: true, color: C.vermelho } }];
        if (it.status === 'nao_houve') partes.push({ text: ' - Não houve fórum', options: { color: C.escuro } });
        else if (it.status === 'sem_registro') partes.push({ text: ' - Sem registro na planilha', options: { color: C.escuro } });
        else partes.push({ text: ' - ' + [it.nome, it.unidade].filter(Boolean).join(' - '), options: { color: C.escuro } });
        texto(s, partes, x + 0.75, y + 0.2, colW - 1.4, 0.3, { fontSize: 12 });
        if (it.status === 'ok') s.addImage({ data: icone('check', C.verde), x: x + colW - 0.55, y: y + 0.13, w: 0.4, h: 0.4 });
        if (it.status === 'nao_houve') s.addImage({ data: icone('proibido', C.cinza), x: x + colW - 0.55, y: y + 0.13, w: 0.4, h: 0.4 });
      });
    });
    return s;
  }

  // Acumulados Kaizens: barras por unidade (decrescente) e caixa de evolução geral
  function laminaKaizens(pptx, ctx, d) {
    var kz = d.kaizens;
    var s = lamina(pptx, ctx, { titulo: 'Acumulado de Kaizens', sub: 'Período - Outubro de 2024 a Agosto de 2026' });
    addGrafico(s, ctx, [{ name: 'Kaizens acumulados', labels: kz.unidades.map(function (u) { return u.nome; }),
      values: kz.unidades.map(function (u) { return u.valor; }), cor: C.ardosia }],
      opcChart({ x: X0, y: 1.75, w: W, h: 4.95, chartColors: [C.ardosia], showLegend: false, dataLabelPosition: 'outEnd',
        dataLabelFormatCode: '0', valAxisMinVal: 0, valAxisMaxVal: 55, barGapWidthPct: 50, catAxisLabelFontSize: 9 }));
    var bw = 6.2, bx = (PAG_W - bw) / 2, by = 6.85, bh = 0.92;
    s.addShape('rect', { x: bx, y: by, w: bw, h: bh, fill: { color: 'F3F4F6' }, line: { type: 'none' } });
    s.addImage({ data: icone('seta', C.ardosia), x: bx + 0.25, y: by + 0.18, w: 0.56, h: 0.56 });
    texto(s, [{ text: 'Evolução geral: ', options: { bold: true, color: C.escuro } },
      { text: num(kz.evolucao, 2) + '%', options: { bold: true, color: C.ardosia } }], bx + 1.0, by + 0.14, bw - 1.2, 0.36, { fontSize: 16 });
    texto(s, 'Total anterior: ' + kz.anterior + ' Kaizens | Total atualizado: ' + kz.atualizado + ' Kaizens',
      bx + 1.0, by + 0.52, bw - 1.2, 0.26, { fontSize: 10, color: C.texto });
    return s;
  }

  function construirApresentacao(d, opcoes) {
    opcoes = opcoes || {};
    var Ctor = opcoes.PptxGenJS || (typeof window !== 'undefined' ? window.PptxGenJS : null);
    if (!Ctor) return Promise.reject(new Error('PptxGenJS não encontrado'));
    return obterLogos(opcoes).then(function (logos) {
      var pptx = new Ctor();
      pptx.defineLayout({ name: LAYOUT, width: PAG_W, height: PAG_H });
      pptx.layout = LAYOUT;
      pptx.title = d.meta.evento + ' - ' + d.meta.periodo;
      var ctx = { logos: logos, slides: [], palco: opcoes.PptxGenJS === PalcoPptx };
      var s;

      // 1. Pauta (traço vermelho, itens numerados em duas colunas e losango decorativo à direita)
      s = lamina(pptx, ctx, { titulo: 'PAUTAS DO FÓRUM', sub: d.meta.periodo, destaque: true });
      var metade = Math.ceil(d.pauta.length / 2);
      [d.pauta.slice(0, metade), d.pauta.slice(metade)].forEach(function (col, c) {
        var partes = [];
        col.forEach(function (t, j) {
          partes.push({ text: (c * metade + j + 1) + '.  ', options: { bold: true, color: C.vermelho } });
          partes.push({ text: t, options: { color: C.escuro, breakLine: true } });
        });
        texto(s, partes, X0 + c * 6.3, 3.05, 5.3, 4.6, { fontSize: T.pauta, paraSpaceAfter: 16 });
      });
      // Losango vermelho centrado na borda direita: aparece só a metade esquerda (forma de triângulo)
      s.addShape('diamond', { x: PAG_W - 1.2, y: 2.9, w: 2.4, h: 3.0, fill: { color: C.vermelho }, line: { type: 'none' } });

      // 2. Aderência por unidade
      var ad = d.aderencia;
      var vals = ad.unidades.map(function (u) { return u.valor; });
      var mediaAd = soma(vals, function (v) { return v; }) / vals.length;
      var atingiu = ad.unidades.filter(function (u) { return u.valor >= ad.meta; }).map(function (u) { return u.nome; });
      var abaixo = ad.unidades.filter(function (u) { return u.valor < ad.meta; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: 'Aderência de treinamentos obrigatórios', sub: 'Aderência por unidade (%). Referência: ' + ad.referencia + '.',
        secao: 'Aderência por unidade (%):' });
      indicadores(s, 2.15, [
        { valor: num(ad.meta, 0) + '%', rotulo: 'Meta' },
        { valor: num(mediaAd, 2) + '%', rotulo: 'Aderência média', sub: 'média simples das unidades', cor: mediaAd >= ad.meta ? C.escuro : C.alerta },
        { valor: atingiu.length + ' de ' + vals.length, rotulo: 'Unidades na meta', cor: abaixo.length ? C.alerta : C.escuro },
        { valor: abaixo.length, rotulo: 'Abaixo da meta', sub: abaixo.length ? abaixo.join(', ') : 'nenhuma unidade', cor: abaixo.length ? C.alerta : C.escuro }
      ]);
      var cats = ad.unidades.map(function (u) { return u.nome; });
      s.addChart('bar', [
        { name: 'Atingiu a meta', labels: cats, values: vals.map(function (v) { return v >= ad.meta ? v : 0; }) },
        { name: 'Abaixo da meta', labels: cats, values: vals.map(function (v) { return v < ad.meta ? v : 0; }) }
      ], opcChart({ x: X0, y: 3.5, w: W, h: 3.45,
        chartColors: [C.ardosia, C.alerta], barGrouping: 'stacked',
        showLegend: true, legendPos: 'b', valAxisMinVal: 0, valAxisMaxVal: 110,
        valAxisMajorUnit: 20, valAxisLabelFormatCode: '0"%"',
        dataLabelFormatCode: '0.00"%";-0.00"%";;',
        dataLabelPosition: 'ctr', dataLabelColor: C.branco,
        catAxisLabelFontSize: T.eixo, barGapWidthPct: 60 }));

      // 3. Inspeções mensais TST: realizado x meta por unidade, com faixa de unidades abaixo da meta
      if (d.inspecoes) {
        var ins = d.inspecoes;
        var nomesIns = ins.unidades.map(function (u) { return u.nome; });
        s = lamina(pptx, ctx, { titulo: 'Inspeções mensais - TST', sub: 'Quantidade realizada por unidade. Referência: ' + ins.referencia + '.' });
        s.addShape('rect', { x: X0, y: 1.75, w: W, h: 0.8, fill: { color: 'F3F4F6' }, line: { type: 'none' } });
        s.addShape('rect', { x: X0, y: 1.75, w: 0.07, h: 0.8, fill: { color: C.vermelho }, line: { type: 'none' } });
        texto(s, [
          { text: 'Abaixo da meta (' + ins.abaixo.length + '):', options: { bold: true, color: C.vermelho, breakLine: true } },
          { text: ins.abaixo.length ? ins.abaixo.join(', ') : 'nenhuma unidade', options: { color: C.vermelho } }
        ], X0 + 0.25, 1.86, W - 0.4, 0.6, { fontSize: T.texto });
        s.addChart('bar', [
          { name: 'Quantidade Realizada', labels: nomesIns, values: ins.unidades.map(function (u) { return u.realizado; }) },
          { name: ins.meta !== null ? 'Meta (' + ins.meta + ' inspeções)' : 'Meta', labels: nomesIns, values: ins.unidades.map(function (u) { return u.meta; }) }
        ], opcChart({ x: X0, y: 2.85, w: W, h: 4.95, chartColors: [C.ardosia, C.alerta], showLegend: true, legendPos: 'b',
          valAxisMinVal: 0, valAxisMaxVal: Math.max.apply(null, ins.unidades.map(function (u) { return Math.max(u.realizado, u.meta); })) + 1,
          valAxisMajorUnit: 1, valAxisLabelFormatCode: '0', dataLabelFormatCode: '0',
          dataLabelPosition: 'outEnd', barGapWidthPct: 60, catAxisLabelFontSize: 9 }));
      }

      // 4. VCT quantidades por unidade
      var vq = d.vct;
      var us = vq.unidades;
      var tTec = soma(us, function (u) { return u.tecnicos; });
      var tSup = soma(us, function (u) { return u.liderança; });
      var pTec = soma(us, function (u) { return u.planejTec; });
      var pSup = soma(us, function (u) { return u.planejSup; });
      var tReal = tTec + tSup;
      var tPlan = soma(us, function (u) { return u.planejado; });
      var varPct = tPlan ? (tReal - tPlan) / tPlan * 100 : 0;
      var abaixoVct = us.filter(function (u) { return u.tecnicos + u.liderança < u.planejado; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: 'VCT - Verificação do ciclo do trabalho', sub: 'Quantidades realizadas por unidade. Referência: ' + vq.referencia + '.',
        secao: 'Quantidades realizadas e planejadas por unidade:' });
      indicadores(s, 2.15, [
        { valor: tTec, rotulo: 'Técnicos de segurança', sub: 'planejado: ' + pTec },
        { valor: tSup, rotulo: 'Liderança', sub: 'planejado: ' + pSup },
        { valor: tReal, rotulo: 'Total realizado', sub: 'técnicos + liderança' },
        { valor: tPlan, rotulo: 'Total planejado' },
        { valor: sinal(varPct, 0), rotulo: 'Variação', sub: abaixoVct.length + ' de ' + us.length + ' unidades abaixo', cor: varPct < 0 ? C.alerta : C.escuro }
      ]);
      var vCats = us.map(function (u) { return u.nome; });
      s.addChart('bar',
        [{ name: 'Técnicos de segurança', labels: vCats, values: us.map(function (u) { return u.tecnicos; }) },
         { name: 'Liderança', labels: vCats, values: us.map(function (u) { return u.liderança; }) },
         { name: 'Total realizado', labels: vCats, values: us.map(function (u) { return u.tecnicos + u.liderança; }) },
         { name: 'Total planejado', labels: vCats, values: us.map(function (u) { return u.planejado; }) }],
        opcChart({ x: X0, y: 3.5, w: W, h: 3.1, chartColors: [C.alerta, C.rosa, C.cinza, C.ardosia], showLegend: true, legendPos: 'b',
          valAxisMinVal: 0, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0', dataLabelFormatCode: '0', barGapWidthPct: 60,
          catAxisLabelFontSize: 9, catAxisLabelRotate: 0, dataLabelFontSize: 9 }));
      texto(s, [{ text: 'Atenção, ', options: { bold: true, color: C.escuro } },
        { text: abaixoVct.length ? 'unidades abaixo do planejado: ' + abaixoVct.join('; ') + '.' : 'todas as unidades atingiram o planejado.', options: { color: C.texto } }],
        X0, 7.02, W, 0.8, { fontSize: T.texto, align: 'justify' });

      if (d.auditorias.linhas && d.auditorias.linhas.length) complemento(pptx, ctx, d.auditorias);

      // 6. Nº desvios por GUT (substitui "Nº de desvios por gerência")
      laminaGut(pptx, ctx, d);
      // 7. OKR 2026 (substitui "Indicadores de desvios e planos de ação")
      laminaOkr(pptx, ctx, d);
      laminaOkrUnidades(pptx, ctx, d);
      // 8. Cronograma de apresentação
      laminaCronograma(pptx, ctx, d);
      // 9. Acumulados Kaizens
      laminaKaizens(pptx, ctx, d);

      // Logo Enaex no canto superior direito de todas as lâminas
      ctx.slides.forEach(function (slide) {
        slide.addImage({ data: logos.enaex, x: X0 + W - 1.57, y: 0.4, w: 1.57, h: 0.5 });
      });
      return pptx;
    });
  }

  function nomeArquivo(dados, extensao) {
    return 'Forum_Seguranca_' + String(dados.meta.periodo).trim().replace(/\s+/g, '_') + '.' + extensao;
  }

  function baixarArquivo(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Revoga só depois de um tempo, para o Chrome terminar o download (evita arquivo .tmp).
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
    return nome;
  }

  function baixarApresentacao(dados) {
    var nome = nomeArquivo(dados, 'pptx');
    return construirApresentacao(dados, {}).then(function (pptx) {
      return pptx.write({ outputType: 'blob' });
    }).then(function (blob) {
      return baixarArquivo(blob, nome);
    });
  }

  // ---------- palco HTML: desenha cada lâmina no navegador (base do PDF) ----------
  // Implementa as mesmas chamadas usadas acima (addText, addShape, addImage, addTable, addChart),
  // em um <div> de 13,333 x 8,527 pol., para o html2canvas capturar.
  function posicaoCss(o) {
    var css = 'position:absolute;left:' + (o.x * POL) + 'px;top:' + (o.y * POL) + 'px;width:' + (o.w * POL) + 'px;';
    if (o.h !== undefined) css += 'height:' + (o.h * POL) + 'px;';
    return css;
  }

  function novoDiv(css) {
    var d = document.createElement('div');
    d.style.cssText = css;
    return d;
  }

  function PalcoSlide() {
    this.el = novoDiv('position:relative;overflow:hidden;background:#ffffff;width:' + (PAG_W * POL) + 'px;height:' + (PAG_H * POL) + 'px;');
    this.graficos = [];
  }

  Object.defineProperty(PalcoSlide.prototype, 'background', {
    set: function (v) { this.el.style.background = '#' + ((v && v.color) || C.branco); }
  });

  PalcoSlide.prototype.addText = function (conteudo, o) {
    var caixa = novoDiv(posicaoCss(o) + 'font-family:' + FONT + ';font-size:' + (o.fontSize * PT) + 'px;color:#' + (o.color || C.texto) +
      ';text-align:' + (o.align || 'left') + ';line-height:1.2;white-space:pre-wrap;' + (o.bold ? 'font-weight:700;' : ''));
    var espaco = (o.paraSpaceAfter || 0) * PT;
    var paragrafo = novoDiv('margin:0 0 ' + espaco + 'px 0;');
    var trechos = Array.isArray(conteudo) ? conteudo : [{ text: conteudo, options: {} }];
    trechos.forEach(function (tr) {
      var op = tr.options || {};
      var span = document.createElement('span');
      span.textContent = tr.text;
      if (op.bold) span.style.fontWeight = '700';
      if (op.color) span.style.color = '#' + op.color;
      paragrafo.appendChild(span);
      if (op.breakLine) {
        caixa.appendChild(paragrafo);
        paragrafo = novoDiv('margin:0 0 ' + espaco + 'px 0;');
      }
    });
    if (paragrafo.childNodes.length) caixa.appendChild(paragrafo);
    this.el.appendChild(caixa);
  };

  PalcoSlide.prototype.addShape = function (tipo, o) {
    if (tipo === 'rect' || tipo === 'roundRect' || tipo === 'ellipse') {
      var css = posicaoCss(o) + 'box-sizing:border-box;background:#' + o.fill.color + ';';
      if (o.line && o.line.color) css += 'border:' + (o.line.width || 1) * PT + 'px solid #' + o.line.color + ';';
      if (tipo === 'roundRect') css += 'border-radius:' + (o.rectRadius || 0) * POL + 'px;';
      if (tipo === 'ellipse') css += 'border-radius:50%;';
      this.el.appendChild(novoDiv(css));
    } else if (tipo === 'diamond') {
      // Metade esquerda do losango (ápice à esquerda, base na borda da página), como imagem SVG:
      // o html2canvas não aplica clip-path nem desenha bordas de elementos com largura zero.
      var lw = (o.w / 2) * POL, lh = o.h * POL;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + lw + '" height="' + lh + '" viewBox="0 0 ' + lw + ' ' + lh + '">' +
        '<polygon points="0,' + (lh / 2) + ' ' + lw + ',0 ' + lw + ',' + lh + '" fill="#' + o.fill.color + '"/></svg>';
      var img = document.createElement('img');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      img.alt = '';
      img.style.cssText = 'position:absolute;left:' + (o.x * POL) + 'px;top:' + (o.y * POL) + 'px;width:' + lw + 'px;height:' + lh + 'px;';
      this.el.appendChild(img);
    }
  };

  PalcoSlide.prototype.addImage = function (o) {
    var img = document.createElement('img');
    img.src = o.data;
    img.alt = '';
    img.style.cssText = posicaoCss(o) + 'object-fit:contain;';
    this.el.appendChild(img);
  };

  PalcoSlide.prototype.addTable = function (linhas, o) {
    var tab = document.createElement('table');
    var m = o.margin || [0.03, 0.05, 0.03, 0.05];
    var preenchimento = m.map(function (v) { return (v * POL) + 'px'; }).join(' ');
    tab.style.cssText = 'position:absolute;left:' + (o.x * POL) + 'px;top:' + (o.y * POL) + 'px;width:' + (o.w * POL) +
      'px;table-layout:fixed;border-collapse:collapse;font-family:' + (o.fontFace || FONT) + ';';
    var grupo = document.createElement('colgroup');
    (o.colW || []).forEach(function (cw) {
      var col = document.createElement('col');
      col.style.width = (cw * POL) + 'px';
      grupo.appendChild(col);
    });
    tab.appendChild(grupo);
    linhas.forEach(function (linha) {
      var tr = document.createElement('tr');
      tr.style.height = ((o.rowH || 0.3) * POL) + 'px';
      linha.forEach(function (cel) {
        var op = cel.options || {};
        var td = document.createElement('td');
        td.textContent = cel.text == null ? '' : String(cel.text);
        td.style.cssText = 'padding:' + preenchimento + ';vertical-align:middle;border:0;text-align:' + (op.align || 'left') + ';' +
          (op.fill ? 'background:#' + op.fill.color + ';' : '') +
          'font-size:' + ((op.fontSize || 10) * PT) + 'px;color:#' + (op.color || C.texto) + ';font-weight:' + (op.bold ? 700 : 400) + ';';
        tr.appendChild(td);
      });
      tab.appendChild(tr);
    });
    this.el.appendChild(tab);
  };

  PalcoSlide.prototype.addChart = function (tipo, series, o) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(o.w * POL);
    canvas.height = Math.round(o.h * POL);
    canvas.style.cssText = 'display:block;width:' + (o.w * POL) + 'px;height:' + (o.h * POL) + 'px;';
    var caixa = novoDiv(posicaoCss(o));
    caixa.appendChild(canvas);
    this.el.appendChild(caixa);
    this.graficos.push({ canvas: canvas, config: configurarGrafico(series, o) });
  };

  function PalcoPptx() {
    this.slides = [];
    this.layout = null;
    this.title = '';
  }
  PalcoPptx.prototype.defineLayout = function () {};
  PalcoPptx.prototype.addSlide = function () {
    var s = new PalcoSlide();
    this.slides.push(s);
    return s;
  };

  // Formata um valor com um código de formato simples do PowerPoint ("0", "0\"%\"", "0.00\"%\";-0.00\"%\";;").
  function formatarValor(codigo, v) {
    var n = Number(v);
    if (v === null || v === undefined || !Number.isFinite(n)) return '';
    if (!codigo) return n.toLocaleString('pt-BR');
    var partes = String(codigo).split(';');
    var secao = n < 0 && partes.length > 1 ? partes[1] : (n === 0 && partes.length > 2 ? partes[2] : partes[0]);
    if (!secao) return '';
    var casasMatch = secao.match(/0\.(0+)/);
    var casas = casasMatch ? casasMatch[1].length : 0;
    var txt = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    if (n < 0 && partes.length === 1) txt = '-' + txt;
    return txt + (secao.indexOf('%') >= 0 ? '%' : '');
  }

  function fonteGrafico(tamanhoPt, negrito) {
    return { family: FONT, size: tamanhoPt * PT, weight: negrito ? '700' : '400' };
  }

  // Rótulos longos de categoria são quebrados em até três linhas (máximo ~13 caracteres por linha).
  function quebrarRotulo(nome) {
    var linhas = [], atual = '';
    String(nome).split(' ').forEach(function (p) {
      if (atual && (atual + ' ' + p).length > 13) { linhas.push(atual); atual = p; }
      else atual = atual ? atual + ' ' + p : p;
    });
    if (atual) linhas.push(atual);
    return linhas.length > 1 ? linhas : linhas[0];
  }

  // Converte as opções de gráfico das lâminas em configuração do Chart.js (mesma aparência).
  function configurarGrafico(series, o) {
    var horizontal = o.barDir === 'bar';
    var empilhado = o.barGrouping === 'stacked';
    var cores = o.chartColors || [];
    var central = o.dataLabelPosition === 'ctr';
    var labels = series[0].labels.map(quebrarRotulo);

    var datasets = series.map(function (s, i) {
      if (s.linha) {
        // Linha de meta (combinação barra + linha, como no PowerPoint)
        return {
          type: 'line', label: s.name, data: s.values, borderColor: '#' + (s.cor || C.escuro),
          backgroundColor: '#' + (s.cor || C.escuro), borderWidth: 2, pointRadius: 0, fill: false,
          borderDash: [7, 5], order: 1, datalabels: { display: false }
        };
      }
      return {
        label: s.name,
        data: s.values,
        backgroundColor: '#' + (cores[i] || C.escuro),
        barPercentage: 0.9,
        categoryPercentage: 0.8,
        datalabels: {
          display: o.showValue !== false,
          anchor: central ? 'center' : 'end',
          align: central ? 'center' : 'end',
          offset: central ? 0 : 2,
          color: '#' + (o.dataLabelColor || C.escuro),
          font: fonteGrafico(o.dataLabelFontSize || T.rotulo, true),
          formatter: function (v) { return formatarValor(o.dataLabelFormatCode, v); }
        }
      };
    });

    var escalaValor = {
      stacked: empilhado, beginAtZero: true, display: !o.valAxisHidden, grid: { display: false },
      ticks: {
        font: fonteGrafico(T.eixo), color: '#' + C.escuro,
        callback: function (v) { return formatarValor(o.valAxisLabelFormatCode, v); }
      }
    };
    if (o.valAxisMinVal !== undefined) escalaValor.min = o.valAxisMinVal;
    if (o.valAxisMaxVal !== undefined) escalaValor.max = o.valAxisMaxVal;
    if (o.valAxisMajorUnit) escalaValor.ticks.stepSize = o.valAxisMajorUnit;

    var escalaCat = {
      stacked: empilhado, grid: { display: false }, border: { color: '#' + C.linha },
      ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: fonteGrafico(o.catAxisLabelFontSize || T.eixo), color: '#' + C.escuro }
    };
    if (horizontal) escalaCat.reverse = true; // primeira categoria embaixo, como no PowerPoint

    var escalas = {};
    escalas[horizontal ? 'x' : 'y'] = escalaValor;
    escalas[horizontal ? 'y' : 'x'] = escalaCat;

    return {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: false,
        animation: false,
        devicePixelRatio: 2,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: {
            display: !!o.showLegend,
            position: o.legendPos === 'b' ? 'bottom' : 'top',
            labels: { boxWidth: 12, color: '#' + C.escuro, font: fonteGrafico(o.legendFontSize || T.legenda) }
          }
        },
        scales: escalas
      }
    };
  }

  // ---------- PDF ----------
  var PDF_BIBLIOTECAS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ];

  function carregarScript(url) {
    return new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () { ok(); };
      s.onerror = function () { erro(new Error('não foi possível carregar ' + url)); };
      document.head.appendChild(s);
    });
  }

  function carregarBibliotecasPdf() {
    var fila = Promise.resolve();
    if (!window.html2canvas) fila = fila.then(function () { return carregarScript(PDF_BIBLIOTECAS[0]); });
    if (!(window.jspdf && window.jspdf.jsPDF)) fila = fila.then(function () { return carregarScript(PDF_BIBLIOTECAS[1]); });
    return fila;
  }

  function baixarPdf(dados) {
    var nome = nomeArquivo(dados, 'pdf');
    var graficos = [];
    var raiz = null;
    return carregarBibliotecasPdf().then(function () {
      if (typeof Chart === 'undefined') throw new Error('biblioteca de gráficos não carregou.');
      return construirApresentacao(dados, { PptxGenJS: PalcoPptx });
    }).then(function (palco) {
      raiz = document.createElement('div');
      raiz.setAttribute('aria-hidden', 'true');
      raiz.style.cssText = 'position:absolute;left:-100000px;top:0;';
      palco.slides.forEach(function (s) {
        raiz.appendChild(s.el);
        s.graficos.forEach(function (g) { graficos.push(g); });
      });
      document.body.appendChild(raiz);
      if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
      graficos.forEach(function (g) { g.instancia = new Chart(g.canvas, g.config); });

      var pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'in', format: [PAG_W, PAG_H], compress: true });
      var fila = Promise.resolve();
      palco.slides.forEach(function (s, i) {
        fila = fila.then(function () {
          return window.html2canvas(s.el, { scale: 2, backgroundColor: '#ffffff', logging: false });
        }).then(function (canvas) {
          if (i > 0) pdf.addPage([PAG_W, PAG_H], 'landscape');
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAG_W, PAG_H);
        });
      });
      return fila.then(function () {
        pdf.save(nome);
        return nome;
      });
    }).finally(function () {
      graficos.forEach(function (g) { if (g.instancia) g.instancia.destroy(); });
      if (raiz) raiz.remove();
    });
  }

  var alvo = typeof window !== 'undefined' ? window : this;
  alvo.construirApresentacao = construirApresentacao;
  alvo.baixarApresentacao = baixarApresentacao;
  alvo.baixarPdf = baixarPdf;
  alvo.iconeLamina = icone;
})();
