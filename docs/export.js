(function () {
  'use strict';

  var C = {
    verm: 'B5121B', rosa: 'E2B4B8', escuro: '3D4248', medio: '8B9096', claro: 'C4C8CC',
    verde: '3D4248', laranja: 'E30613', amarelo: 'E2B4B8', azul: '8B9096',
    linha: 'DADDE1', zebra: 'F2F3F5', branco: 'FFFFFF'
  };
  var FONT = 'Arial';
  var X0 = 0.5, X1 = 12.83, W = 12.33;
  var MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var COR_NOME = { vermelho: C.verm, laranja: C.laranja, verde: C.verde, azul: C.azul };

  function soma(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }
  function num(v, casas) { return Number(v).toFixed(casas || 0).replace('.', ','); }
  function sinal(v, casas) { return (v > 0 ? '+' : '') + num(v, casas) + '%'; }
  function vazio(t) { return (t === undefined || t === null || String(t).trim() === '') ? '—' : String(t); }

  // Dimensões do PNG a partir do data URI (para manter proporção)
  function tamanhoPng(uri) {
    try {
      var b64 = uri.split(',')[1];
      var bin = typeof atob === 'function' ? atob(b64.slice(0, 64)) : Buffer.from(b64.slice(0, 64), 'base64').toString('binary');
      var r = function (o) { return ((bin.charCodeAt(o) << 24) | (bin.charCodeAt(o + 1) << 16) | (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3)) >>> 0; };
      return { w: r(16), h: r(20) };
    } catch (e) { return { w: 3, h: 1 }; }
  }

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
    if (opcoes && opcoes.logos && opcoes.logos.enaex) return Promise.resolve(opcoes.logos);
    return Promise.all([buscarImagem('assets/enaex.png'), buscarImagem('assets/enaex-white.png')]).then(function (r) {
      return { enaex: r[0], enaexBranco: r[1] };
    });
  }

  function texto(s, t, x, y, w, h, o) {
    var op = { x: x, y: y, w: w, h: h, fontFace: FONT, fontSize: 12, color: C.escuro, margin: 0, valign: 'top' };
    for (var k in o) op[k] = o[k];
    s.addText(t, op);
  }

  function logosTopo(s, L, ctx) {
    var a = ctx.dim.enaex;
    var he = 0.7;
    var we = he * a.w / a.h;
    s.addImage({ data: L.enaex, x: X1 - we, y: 0.35, w: we, h: he });
  }

  function rodape(s) {
    s.addShape('line', { x: X0, y: 6.95, w: W, h: 0, line: { color: C.claro, width: 1 } });
    texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 7.02, W, 0.25, { fontSize: 9, color: C.medio, align: 'right' });
  }

  // Estrutura comum da lâmina
  function lamina(pptx, ctx, o) {
    var s = pptx.addSlide();
    s.background = { color: C.branco };
    texto(s, String(o.titulo), X0, 0.35, 8.3, 0.55, { fontSize: 24, bold: true, color: '23292F', valign: 'top', fit: 'shrink' });
    if (o.sub) texto(s, o.sub, X0, 0.95, 8.3, 0.35, { fontSize: 14, color: '6B7280' });
    logosTopo(s, ctx.logos, ctx);
    var cab = o.cabecalhos || (o.secao ? [{ t: o.secao, x: X0, w: W }] : []);
    cab.forEach(function (c) {
      texto(s, c.t, c.x, 1.45, c.w, 0.35, { fontSize: c.fs || 18, valign: 'bottom' });
    });
    if (cab.length) s.addShape('line', { x: X0, y: 1.85, w: W, h: 0, line: { color: C.linha, width: 1 } });
    if (o.nota) {
      var partes = [{ text: 'Atenção,', options: { bold: true } }, { text: ' ' + o.nota }];
      texto(s, partes, X0, 6.1, W, 0.7, { fontSize: 12 });
    }
    rodape(s);
    return s;
  }

  function kpi(s, x, y, w, h, valor, rotulo, cor, fsV) {
    s.addShape('rect', { x: x, y: y, w: w, h: h, fill: { color: C.branco }, line: { color: C.linha, width: 1 } });
    texto(s, String(valor), x + 0.05, y + 0.08, w - 0.1, h * 0.55, { fontSize: fsV || 28, bold: true, color: cor || C.verm, align: 'center', valign: 'middle' });
    texto(s, rotulo, x + 0.08, y + h * 0.6, w - 0.16, h * 0.36, { fontSize: 11, color: C.medio, align: 'center', valign: 'top' });
  }

  function cab(t, extra) {
    var o = { bold: true, color: C.branco, fill: { color: C.escuro }, fontSize: 11, fontFace: FONT, valign: 'middle' };
    for (var k in extra) o[k] = extra[k];
    return { text: t, options: o };
  }
  function cel(t, i, extra) {
    var o = { color: C.escuro, fill: { color: i % 2 === 0 ? C.branco : C.zebra }, fontSize: 10, fontFace: FONT, valign: 'middle' };
    for (var k in extra) o[k] = extra[k];
    return { text: String(t), options: o };
  }
  function tabela(s, rows, x, y, w, colW, rowH) {
    s.addTable(rows, { x: x, y: y, w: w, colW: colW, rowH: rowH || 0.3, border: { type: 'solid', pt: 0.5, color: C.linha }, margin: [0.03, 0.07, 0.03, 0.07], fontFace: FONT });
  }

  function opcChart(extra) {
    var o = {
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT, dataLabelFontFace: FONT,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, catAxisLabelColor: C.escuro, valAxisLabelColor: C.escuro,
      valGridLine: { color: 'E8EAEC', size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: false, legendFontFace: FONT, legendFontSize: 10, legendColor: C.escuro,
      showValue: true, dataLabelFontBold: true, dataLabelFontSize: 10, dataLabelColor: C.escuro, dataLabelPosition: 'outEnd',
      barGapWidthPct: 50
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  function addBar(s, cats, series, o) {
    var dados = series.map(function (se) { return { name: se.name, labels: cats, values: se.values }; });
    s.addChart('bar', dados, opcChart(o));
  }

  function construirApresentacao(d, opcoes) {
    opcoes = opcoes || {};
    var Ctor = opcoes.PptxGenJS || (typeof window !== 'undefined' ? window.PptxGenJS : null);
    if (!Ctor) return Promise.reject(new Error('PptxGenJS não encontrado'));
    return obterLogos(opcoes).then(function (logos) {
      var pptx = new Ctor();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.title = d.meta.evento + ' - ' + d.meta.periodo;
      var ctx = { logos: logos, dim: { enaex: tamanhoPng(logos.enaex) } };
      var s, i;
      var ref = d.meta.referencia;

      // 1. Capa
      // Capa no padrão "Fluxo Operacional": fundo vermelho escuro, diagonal translúcida, logo branca, título à direita
      s = pptx.addSlide();
      s.background = { color: '7A1013' };
      s.addShape('rtTriangle', { x: 0, y: 0, w: 13.333, h: 7.5, flipH: true, flipV: false, rotate: 0, fill: { color: 'B5121B', transparency: 78 }, line: { color: 'B5121B', transparency: 100, width: 0 } });
      var lb = logos.enaexBranco || logos.enaex;
      var ab = tamanhoPng(lb);
      s.addImage({ data: lb, x: 0.55, y: 0.4, w: 0.6 * ab.w / ab.h, h: 0.6 });
      texto(s, String(d.meta.evento || '34º Fórum de Segurança').toUpperCase(), 3.3, 4.95, 9.5, 0.8, { fontSize: 38, color: C.branco, align: 'right', valign: 'middle' });
      texto(s, d.meta.gerencia, 3.3, 5.8, 9.5, 0.4, { fontSize: 18, color: C.branco, align: 'right' });
      texto(s, d.meta.periodo, 3.3, 6.25, 9.5, 0.35, { fontSize: 14, bold: true, color: 'C9A227', align: 'right' });
      texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 7.02, W, 0.25, { fontSize: 9, color: C.branco, align: 'right' });
      texto(s, d.meta.aviso, X0, 7.02, 8, 0.25, { fontSize: 9, color: 'E5C9CB' });

      // 2. Pauta
      s = lamina(pptx, ctx, { titulo: 'Pauta', sub: d.meta.evento + ' - ' + d.meta.periodo, secao: 'Itens da reunião:' });
      var metade = Math.ceil(d.pauta.length / 2);
      [d.pauta.slice(0, metade), d.pauta.slice(metade)].forEach(function (col, c) {
        var partes = [];
        col.forEach(function (t, j) {
          partes.push({ text: (c * metade + j + 1) + '.  ', options: { bold: true, color: C.verm, breakLine: false } });
          partes.push({ text: t, options: { breakLine: true } });
        });
        texto(s, partes, X0 + c * 6.3, 2.2, 5.9, 3.8, { fontSize: 16, paraSpaceAfter: 14 });
      });

      // 3. Aderência
      var ad = d.aderencia;
      var vals = ad.unidades.map(function (u) { return u.valor; });
      var media = soma(vals, function (v) { return v; }) / vals.length;
      var atingiu = vals.filter(function (v) { return v >= ad.meta; }).length;
      s = lamina(pptx, ctx, { titulo: ad.titulo, sub: ad.subtitulo, secao: 'Aderência média por unidade:', nota: 'valores fictícios. A linha tracejada indica a meta de ' + ad.meta + '%.' });
      var cats = ad.unidades.map(function (u) { return u.nome; });
      s.addChart([
        { type: 'bar', data: [{ name: 'Aderência (%)', labels: cats, values: vals }], options: opcChart({
          chartColors: vals.map(function (v) { return v >= ad.meta ? C.verde : C.verm; }),
          dataLabelPosition: 'inEnd', dataLabelColor: C.branco, dataLabelFormatCode: '0.0', catAxisLabelFontSize: 9 }) },
        { type: 'line', data: [{ name: 'Meta', labels: cats, values: cats.map(function () { return ad.meta; }) }], options: {
          chartColors: [C.escuro], lineSize: 1.5, lineDataSymbol: 'none', lineDash: 'dash', showValue: false } }
      ], opcChart({ x: X0, y: 2.0, w: 9.2, h: 4.05, valAxisMinVal: 0, valAxisMaxVal: 110, valAxisMajorUnit: 20, valAxisLabelFormatCode: '0.0', catAxisLabelFontSize: 9 }));
      kpi(s, 10.0, 2.2, 2.83, 1.3, num(media, 1) + '%', 'Média geral', C.verm);
      kpi(s, 10.0, 3.75, 2.83, 1.3, atingiu + ' de ' + vals.length, 'unidades atingiram a meta', atingiu === vals.length ? C.verde : C.verm, 24);
      kpi(s, 10.0, 5.0 + 0.3, 2.83, 0.7, ad.meta + '%', 'Meta', C.escuro, 18);

      // 4. VCT quantidades
      var vq = d.vct.quantidades;
      var us = vq.unidades;
      var tTec = soma(us, function (u) { return u.tecnicos; });
      var tSup = soma(us, function (u) { return u.supervisores; });
      var tPlan = soma(us, function (u) { return u.planejado; });
      var tReal = tTec + tSup;
      var varPct = tPlan ? (tReal - tPlan) / tPlan * 100 : 0;
      var abaixo = us.filter(function (u) { return u.tecnicos + u.supervisores < u.planejado; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: vq.titulo, sub: vq.referencia, secao: 'VCT realizados x planejados por unidade:',
        nota: abaixo.length ? 'unidades abaixo do planejado: ' + abaixo.join('; ') + '.' : 'todas as unidades atingiram o planejado.' });
      var kw = 1.45, kg = 0.17;
      [[tTec, 'Técnicos', C.laranja], [tSup, 'Supervisores', C.amarelo], [tReal, 'Realizado', C.medio], [tPlan, 'Planejado', C.verde], [sinal(varPct, 0), 'Variação vs. planejado', varPct < 0 ? C.verm : C.verde]].forEach(function (k, j) {
        kpi(s, X0 + j * (kw + kg), 1.98, kw, 0.95, k[0], k[1], k[2], 24);
      });
      var catsV = us.map(function (u) { return u.nome; });
      addBar(s, catsV, [
        { name: 'Técnicos', values: us.map(function (u) { return u.tecnicos; }) },
        { name: 'Supervisores', values: us.map(function (u) { return u.supervisores; }) },
        { name: 'Total realizado', values: us.map(function (u) { return u.tecnicos + u.supervisores; }) },
        { name: 'Total planejado', values: us.map(function (u) { return u.planejado; }) }
      ], { x: X0, y: 3.0, w: W, h: 3.05, chartColors: [C.laranja, C.amarelo, C.medio, C.verde], showLegend: true, legendPos: 'b',
        dataLabelFontSize: 8, catAxisLabelFontSize: 9, valAxisMinVal: 0, valAxisMajorUnit: 1, barGapWidthPct: 40 });

      // 5. VCT auditorias
      var au = d.vct.auditorias;
      var conf = soma(au.procedimentos, function (p) { return p.conforme; });
      var nconf = soma(au.procedimentos, function (p) { return p.naoConforme; });
      var tot = conf + nconf;
      var idx = tot ? conf / tot * 100 : 0;
      s = lamina(pptx, ctx, { titulo: au.titulo, sub: au.referencia, secao: 'Auditorias de VCT por procedimento:' });
      [[conf, 'Conformes', C.verde], [nconf, 'Não conformes', C.verm], [tot, 'Total', C.escuro], [num(idx, 1) + '%', 'Índice de conformidade', idx >= au.meta ? C.verde : C.verm], ['≥ ' + au.meta + '%', 'Meta', C.escuro]].forEach(function (k, j) {
        kpi(s, X0 + j * 2.5, 1.98, 2.33, 0.95, k[0], k[1], k[2], 24);
      });
      var rows = [[cab('Procedimento auditado'), cab('Conforme', { align: 'center' }), cab('Não conforme', { align: 'center' }), cab('Principais desvios')]];
      au.procedimentos.forEach(function (p, j) {
        rows.push([cel(p.nome, j), cel(p.conforme, j, { align: 'center' }), cel(p.naoConforme, j, { align: 'center', bold: p.naoConforme > 0, color: p.naoConforme > 0 ? C.verm : C.escuro }), cel(vazio(p.desvio), j)]);
      });
      tabela(s, rows, X0, 3.1, W, [4.9, 1.1, 1.3, 5.03], 0.3);

      // 6. Desvios
      var dv = d.desvios;
      var totalDv = soma(dv.porGerencia, function (g) { return g.valor; });
      s = lamina(pptx, ctx, { titulo: dv.titulo, sub: dv.referencia, cabecalhos: [{ t: 'Nº de desvios por gerência:', x: X0, w: 6, fs: 16 }, { t: 'Nº de desvios por categoria:', x: 6.8, w: 6, fs: 16 }] });
      var ordenar = function (a) { return a.slice().sort(function (p, q) { return q.valor - p.valor; }).reverse(); };
      var g = ordenar(dv.porGerencia), cg = ordenar(dv.porCategoria);
      addBar(s, g.map(function (x) { return x.nome; }), [{ name: 'Desvios', values: g.map(function (x) { return x.valor; }) }],
        { x: X0, y: 2.55, w: 6.0, h: 4.3, barDir: 'bar', chartColors: [C.verm], catAxisLabelFontSize: 9, valAxisHidden: true, valGridLine: { style: 'none' } });
      addBar(s, cg.map(function (x) { return x.nome; }), [{ name: 'Desvios', values: cg.map(function (x) { return x.valor; }) }],
        { x: 6.8, y: 2.55, w: 6.03, h: 4.3, barDir: 'bar', chartColors: [C.escuro], catAxisLabelFontSize: 9, valAxisHidden: true, valGridLine: { style: 'none' } });
      texto(s, [{ text: String(totalDv), options: { bold: true, color: C.verm, fontSize: 28 } }, { text: '  desvios no total', options: { color: C.medio, fontSize: 12 } }], X0, 1.95, 6, 0.55, { valign: 'middle' });

      // 7. GUT
      var gu = dv.gut;
      s = lamina(pptx, ctx, { titulo: gu.titulo, sub: dv.referencia, cabecalhos: [{ t: 'Desvios por classe:', x: X0, w: 3.4, fs: 14 }, { t: 'Desvios por nota GUT:', x: 4.3, w: 5, fs: 14 }, { t: 'GUT alto por gerência:', x: 9.6, w: 3.2, fs: 14 }] });
      var cc = { Baixa: C.verde, 'Média': C.amarelo, Alta: C.verm };
      addBar(s, gu.classes.map(function (x) { return x.nome; }), [{ name: 'Desvios', values: gu.classes.map(function (x) { return x.valor; }) }],
        { x: X0, y: 2.0, w: 3.5, h: 4.5, chartColors: gu.classes.map(function (x) { return cc[x.nome] || C.medio; }), valAxisMinVal: 0 });
      var nt = gu.notas.slice().sort(function (a, b) { return a.nota - b.nota; });
      addBar(s, nt.map(function (x) { return String(x.nota); }), [{ name: 'Desvios', values: nt.map(function (x) { return x.valor; }) }],
        { x: 4.3, y: 2.0, w: 5.1, h: 4.5, chartColors: nt.map(function (x) { return x.nota >= 10 ? C.verm : C.escuro; }), valAxisMinVal: 0, barGapWidthPct: 30 });
      var rg = [[cab('Gerência'), cab('Valor', { align: 'center' })]];
      gu.altoPorGerencia.forEach(function (x, j) { rg.push([cel(x.nome, j), cel(x.valor, j, { align: 'center' })]); });
      var tAlto = soma(gu.altoPorGerencia, function (x) { return x.valor; });
      rg.push([cel('Total', 1, { bold: true }), cel(tAlto, 1, { bold: true, align: 'center' })]);
      tabela(s, rg, 9.6, 2.2, 3.23, [2.4, 0.83], 0.36);

      // 8. OKR
      var ok = d.okr;
      s = lamina(pptx, ctx, { titulo: ok.titulo, sub: ok.indicador, secao: 'Resultado mensal (' + ok.unidade + ') e meta de ' + ok.meta + '%:' });
      var cm = ok.meses.map(function (m) { return m.mes; });
      s.addChart([
        { type: 'bar', data: [{ name: 'Valor (%)', labels: cm, values: ok.meses.map(function (m) { return m.valor; }) }], options: opcChart({ chartColors: [C.verm], dataLabelFormatCode: '0', barGapWidthPct: 40 }) },
        { type: 'line', data: [{ name: 'Meta', labels: cm, values: cm.map(function () { return ok.meta; }) }], options: { chartColors: [C.verde], lineSize: 1.5, lineDash: 'dash', lineDataSymbol: 'none', showValue: false } }
      ], opcChart({ x: X0, y: 2.0, w: 8.2, h: 4.5, valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20 }));
      var ultimo = ok.meses[ok.meses.length - 1];
      var rk = [[cab('Indicador'), cab('Valor (' + ok.unidade + ')', { align: 'center' })]];
      ok.kpis.forEach(function (k, j) { rk.push([cel(k.nome, j), cel(k.valor, j, { align: 'center' })]); });
      rk.push([cel('Último mês (' + ultimo.mes + ')', ok.kpis.length, { bold: true }), cel(ultimo.valor, ok.kpis.length, { bold: true, align: 'center', color: C.verm })]);
      rk.push([cel('Meta', ok.kpis.length + 1, {}), cel(ok.meta, ok.kpis.length + 1, { align: 'center' })]);
      tabela(s, rk, 9.1, 2.3, 3.73, [2.4, 1.33], 0.4);

      // 9 e 10. Flyrock / Misfire
      [d.flyrock, d.misfire].forEach(function (b, n) {
        var s2 = lamina(pptx, ctx, { titulo: b.titulo, sub: String(b.ano), secao: 'Ocorrências por mês em ' + b.ano + ':' });
        addBar(s2, MESES, [{ name: 'Ocorrências', values: b.mensal }], { x: X0, y: 1.95, w: 7.6, h: 2.85, chartColors: [C.escuro], dataLabelFormatCode: '0', valAxisMinVal: 0, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0' });
        b.classes.forEach(function (c, j) {
          var cx = 8.4 + (j % 2) * 2.25, cy = 2.0 + Math.floor(j / 2) * 1.2;
          s2.addShape('rect', { x: cx, y: cy, w: 2.15, h: 1.1, fill: { color: COR_NOME[c.cor] || C.medio }, line: { color: COR_NOME[c.cor] || C.medio, width: 1 } });
          texto(s2, String(c.valor), cx + 0.05, cy + 0.03, 2.05, 0.4, { fontSize: 20, bold: true, color: C.branco, align: 'center', valign: 'middle' });
          texto(s2, c.nome, cx + 0.07, cy + 0.43, 2.01, 0.65, { fontSize: 7, color: C.branco, align: 'center', valign: 'top', fit: 'shrink' });
        });
        s2.addText([{ text: 'Desvios relacionados: ', options: { color: C.medio, fontSize: 12 } }, { text: String(b.desviosRelacionados), options: { bold: true, color: C.verm, fontSize: 20 } }],
          { x: 8.4, y: 4.4, w: 4.4, h: 0.4, fontFace: FONT, align: 'center', valign: 'middle', margin: 0 });
        var ev = b.eventos.length ? b.eventos : ['—'];
        texto(s2, 'Eventos', X0, 4.9, W, 0.25, { fontSize: 11, bold: true });
        var itens = n === 0
          ? ev.map(function (t, j) { return { text: t, options: { breakLine: j < ev.length - 1 } }; })
          : ev.map(function (t, j) { return { text: t, options: { bullet: true, breakLine: j < ev.length - 1 } }; });
        texto(s2, itens, X0, 5.17, W, 1.7, { fontSize: 11 });
      });

      // 11. Cruz Verde
      var cv = d.cruzVerde;
      s = lamina(pptx, ctx, { titulo: cv.titulo, sub: cv.mes, cabecalhos: [{ t: 'Calendário do mês:', x: X0, w: 6, fs: 16 }, { t: 'Ocorrências:', x: 7.0, w: 5.8, fs: 16 }] });
      var cor = { ok: C.verde, ocorrencia: C.amarelo, dano_pessoal: C.laranja };
      var sz = 0.58, gp = 0.08;
      cv.dias.forEach(function (st, j) {
        var x = X0 + (j % 7) * (sz + gp), y = 2.1 + Math.floor(j / 7) * (sz + gp);
        s.addShape('rect', { x: x, y: y, w: sz, h: sz, fill: { color: cor[st] || C.claro }, line: { color: C.branco, width: 0.5 } });
        texto(s, String(j + 1), x, y, sz, sz, { fontSize: 10, bold: true, color: st === 'ocorrencia' ? C.escuro : C.branco, align: 'center', valign: 'middle' });
      });
      [['ok', 'Sem ocorrência'], ['ocorrencia', 'Ocorrência'], ['dano_pessoal', 'Dano pessoal']].forEach(function (l, j) {
        var ly = 2.2 + j * 0.5;
        s.addShape('rect', { x: 5.35, y: ly, w: 0.3, h: 0.3, fill: { color: cor[l[0]] }, line: { color: cor[l[0]], width: 0.5 } });
        texto(s, l[1], 5.75, ly, 1.2, 0.3, { fontSize: 10, valign: 'middle' });
      });
      var montar = function (tit, arr) {
        var r = [[cab('Data'), cab('Descrição')]];
        if (!arr.length) r.push([cel('—', 0), cel('—', 0)]);
        arr.forEach(function (x, j) { r.push([cel(x.data, j), cel(x.descricao, j)]); });
        return r;
      };
      texto(s, 'Danos pessoais', 7.0, 1.95, 5.8, 0.25, { fontSize: 11, bold: true });
      tabela(s, montar('Pessoais', cv.danosPessoais), 7.0, 2.22, 5.83, [1.0, 4.83], 0.3);
      var yM = 2.22 + 0.3 * (Math.max(cv.danosPessoais.length, 1) + 1) + 0.25;
      texto(s, 'Danos materiais', 7.0, yM, 5.8, 0.25, { fontSize: 11, bold: true });
      tabela(s, montar('Materiais', cv.danosMateriais), 7.0, yM + 0.27, 5.83, [1.0, 4.83], 0.3);

      // 12. Boas práticas
      var bp = d.boasPraticas;
      s = lamina(pptx, ctx, { titulo: bp.titulo, sub: bp.unidade + ' - ' + bp.referencia, secao: 'Indicadores de ' + bp.unidade + ':' });
      bp.indicadores.forEach(function (k, j) {
        kpi(s, X0 + (j % 2) * 6.25, 2.2 + Math.floor(j / 2) * 2.0, 5.83, 1.8, k.valor, k.nome, C.verm, 48);
      });

      // 13. Kaizen
      var kz = d.kaizen;
      var atual = soma(kz.unidades, function (u) { return u.valor; });
      var evo = (atual - kz.anterior) / kz.anterior * 100;
      var mx = Math.max.apply(null, kz.unidades.map(function (u) { return u.valor; }));
      s = lamina(pptx, ctx, { titulo: kz.titulo, sub: kz.periodo, secao: 'Kaizens acumulados por unidade:' });
      addBar(s, kz.unidades.map(function (u) { return u.nome; }), [{ name: 'Kaizens', values: kz.unidades.map(function (u) { return u.valor; }) }],
        { x: X0, y: 2.0, w: 9.2, h: 4.6, chartColors: [C.escuro], dataLabelFormatCode: '0', valAxisMinVal: 0, valAxisMaxVal: Math.ceil(mx / 10) * 10, valAxisLabelFormatCode: '0', catAxisLabelFontSize: 9 });
      kpi(s, 10.0, 2.1, 2.83, 1.2, kz.anterior, 'Total anterior', C.medio);
      kpi(s, 10.0, 3.5, 2.83, 1.2, atual, 'Total atual', C.escuro);
      kpi(s, 10.0, 4.9, 2.83, 1.2, sinal(evo, 2), 'Evolução', evo >= 0 ? C.verde : C.verm);

      // 14. Inspeções cruzadas
      var ic = d.inspecoesCruzadas;
      s = lamina(pptx, ctx, { titulo: ic.titulo, sub: d.meta.periodo, secao: 'Programação por mês:' });
      var stTxt = { S: ['Realizado', C.verde], N: ['Não realizado', C.verm], P: ['Programado', C.medio] };
      var cw = (W - 2.1) / ic.colunas.length;
      var ri = [[cab('Período')].concat(ic.colunas.map(function (c) { return cab(c, { align: 'center' }); }))];
      ri.push([cel('Responsável pela inspeção', 0, { bold: true })].concat(ic.responsavel.map(function (t) { return cel(vazio(t), 0, { align: 'center' }); })));
      ri.push([cel('Unidade a ser inspecionada', 1, { bold: true })].concat(ic.inspecionada.map(function (t) { return cel(vazio(t), 1, { align: 'center' }); })));
      ri.push([cel('Status', 0, { bold: true })].concat(ic.status.map(function (t) {
        var m = stTxt[t] || [vazio(t), C.medio];
        return cel(m[0], 0, { align: 'center', bold: true, color: m[1] });
      })));
      tabela(s, ri, X0, 2.2, W, [2.1].concat(ic.colunas.map(function () { return cw; })), [0.4, 1.1, 1.1, 0.5]);

      // 15. Cronograma
      var cr = d.cronograma;
      s = lamina(pptx, ctx, { titulo: cr.titulo, sub: d.meta.periodo, secao: 'Apresentações do ano:' });
      var stC = { realizado: ['Realizado', C.verde], sem_forum: ['Sem fórum', C.escuro], pendente: ['Pendente', C.medio] };
      var rc = [[cab('Mês'), cab('Apresentador'), cab('Unidade'), cab('Status', { align: 'center' })]];
      cr.itens.forEach(function (it, j) {
        var m = stC[it.status] || [vazio(it.status), C.medio];
        rc.push([cel(it.mes, j), cel(vazio(it.apresentador), j), cel(vazio(it.unidade), j), cel(m[0], j, { align: 'center', bold: true, color: m[1] })]);
      });
      tabela(s, rc, X0, 2.05, W, [2.8, 3.6, 3.6, 2.33], 0.35);

      return pptx;
    });
  }

  function baixarApresentacao(dados) {
    return construirApresentacao(dados, {}).then(function (pptx) {
      return pptx.writeFile({ fileName: 'Forum_Seguranca_Setembro_2026.pptx' });
    });
  }

  var alvo = typeof window !== 'undefined' ? window : this;
  alvo.construirApresentacao = construirApresentacao;
  alvo.baixarApresentacao = baixarApresentacao;
})();
