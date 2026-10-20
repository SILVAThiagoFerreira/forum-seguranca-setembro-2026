(function () {
  'use strict';

  var C = {
    verm: 'B5121B', rosa: 'E2B4B8', escuro: '3D4248', medio: '8B9096', claro: 'C4C8CC',
    verde: '3D4248', laranja: 'E30613', amarelo: 'E2B4B8', azul: '8B9096',
    linha: 'E5E5E5', zebra: 'FFFFFF', branco: 'FFFFFF', cinzaTexto: '4A4A4A'
  };
  var FONT = 'Arial';
  var X0 = 0.5, X1 = 12.83, W = 12.33;

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
    var he = 0.42;
    var we = he * a.w / a.h;
    s.addImage({ data: L.enaex, x: X1 - we, y: 0.4, w: we, h: he });
  }

  function rodape(s) {
    s.addShape('line', { x: X0, y: 6.95, w: W, h: 0, line: { color: C.escuro, width: 0.75 } });
    texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 7.02, W, 0.25, { fontSize: 8, color: C.medio, align: 'right' });
  }

  // Estrutura comum da lâmina
  function lamina(pptx, ctx, o) {
    var s = pptx.addSlide();
    s.background = { color: C.branco };
    texto(s, String(o.titulo).toUpperCase(), X0, 0.45, 9.5, 0.6, { fontSize: 28, bold: false, color: C.verm, valign: 'top', fit: 'shrink' });
    if (o.sub) texto(s, o.sub, X0, 1.05, 9.5, 0.35, { fontSize: 14, color: C.cinzaTexto });
    logosTopo(s, ctx.logos, ctx);
    var cab = o.cabecalhos || (o.secao ? [{ t: o.secao, x: X0, w: W }] : []);
    cab.forEach(function (c) {
      texto(s, c.t, c.x, 1.6, c.w, 0.35, { fontSize: c.fs ? Math.min(c.fs, 16) : 16, color: C.cinzaTexto, valign: 'bottom' });
    });
    if (cab.length) s.addShape('line', { x: X0, y: 2.0, w: W, h: 0, line: { color: C.linha, width: 0.75 } });
    if (o.nota) {
      var partes = [{ text: 'Atenção,', options: { bold: true } }, { text: ' ' + o.nota }];
      texto(s, partes, X0, 6.2, W, 0.6, { fontSize: 11 });
    }
    rodape(s);
    return s;
  }

  function kpi(s, x, y, w, h, valor, rotulo, cor, fsV) {
    texto(s, String(valor), x + 0.05, y + 0.08, w - 0.1, h * 0.55, { fontSize: Math.round((fsV || 28) * 0.8), bold: true, color: cor || C.verm, align: 'center', valign: 'middle' });
    texto(s, rotulo, x + 0.08, y + h * 0.6, w - 0.16, h * 0.36, { fontSize: 10, color: C.medio, align: 'center', valign: 'top' });
  }

  function cab(t, extra) {
    var o = { bold: false, color: C.medio, fill: { color: C.branco }, fontSize: 10, fontFace: FONT, valign: 'middle' };
    for (var k in extra) o[k] = extra[k];
    return { text: t, options: o };
  }
  function cel(t, i, extra) {
    var o = { color: C.escuro, fill: { color: i % 2 === 0 ? C.branco : C.zebra }, fontSize: 10, fontFace: FONT, valign: 'middle' };
    for (var k in extra) o[k] = extra[k];
    return { text: String(t), options: o };
  }
  function tabela(s, rows, x, y, w, colW, rowH) {
    s.addTable(rows, { x: x, y: y, w: w, colW: colW, rowH: rowH || 0.3, border: { type: 'none' }, margin: [0.03, 0.07, 0.03, 0.07], fontFace: FONT });
  }

  function opcChart(extra) {
    var o = {
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT, dataLabelFontFace: FONT,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: C.escuro, valAxisLabelColor: C.escuro,
      valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showLegend: false, legendFontFace: FONT, legendFontSize: 9, legendColor: C.escuro,
      showValue: true, dataLabelFontBold: true, dataLabelFontSize: 9, dataLabelColor: C.escuro, dataLabelPosition: 'outEnd',
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
      var s;

      // 1. Capa
      // Capa no padrão de relatório corporativo: fundo branco, título vermelho em caixa alta, logo colorida
      s = pptx.addSlide();
      s.background = { color: C.branco };
      var lb = logos.enaex;
      var ab = tamanhoPng(lb);
      s.addImage({ data: lb, x: X1 - 0.6 * ab.w / ab.h, y: 0.45, w: 0.6 * ab.w / ab.h, h: 0.6 });
      texto(s, String(d.meta.evento || '34º Fórum de Segurança').toUpperCase(), X0, 3.6, 10.5, 1.0, { fontSize: 36, color: C.verm, valign: 'middle' });
      texto(s, d.meta.gerencia, X0, 4.7, 10.5, 0.4, { fontSize: 18, color: C.cinzaTexto });
      texto(s, d.meta.periodo, X0, 5.15, 10.5, 0.35, { fontSize: 14, color: C.cinzaTexto });
      s.addShape('line', { x: X0, y: 6.95, w: W, h: 0, line: { color: C.escuro, width: 0.75 } });
      texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 7.02, W, 0.25, { fontSize: 8, color: C.medio, align: 'right' });
      texto(s, d.meta.aviso, X0, 7.02, 8, 0.25, { fontSize: 8, color: C.medio });

      // 2. Pauta
      s = lamina(pptx, ctx, { titulo: 'Pauta', sub: d.meta.evento + ' - ' + d.meta.periodo, secao: 'Itens da reunião:' });
      var metade = Math.ceil(d.pauta.length / 2);
      [d.pauta.slice(0, metade), d.pauta.slice(metade)].forEach(function (col, c) {
        var partes = [];
        col.forEach(function (t, j) {
          partes.push({ text: (c * metade + j + 1) + '.  ', options: { bold: true, color: C.verm, breakLine: false } });
          partes.push({ text: t, options: { breakLine: true } });
        });
        texto(s, partes, X0 + c * 6.3, 2.2, 5.9, 3.8, { fontSize: 14, paraSpaceAfter: 18 });
      });

      // 3. Aderência
      var ad = d.aderencia;
      var vals = ad.unidades.map(function (u) { return u.valor; });
      var media = soma(vals, function (v) { return v; }) / vals.length;
      var atingiu = vals.filter(function (v) { return v >= ad.meta; }).length;
      s = lamina(pptx, ctx, { titulo: ad.titulo, sub: ad.subtitulo + ' Referência: ' + ad.referencia + '.', secao: 'Aderência média por unidade:', nota: 'a linha tracejada indica a meta de ' + ad.meta + '%.' });
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
      kpi(s, 10.0, 5.3, 2.83, 0.7, ad.meta + '%', 'Meta', C.escuro, 18);

      // 4. VCT quantidades
      var vq = d.vct.quantidades;
      var us = vq.unidades;
      var tTec = soma(us, function (u) { return u.tecnicos; });
      var tSup = soma(us, function (u) { return u.supervisores; });
      var tPlan = soma(us, function (u) { return u.planejado; });
      var tReal = tTec + tSup;
      var varPct = tPlan ? (tReal - tPlan) / tPlan * 100 : 0;
      var abaixo = us.filter(function (u) { return u.tecnicos + u.supervisores < u.planejado; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: vq.titulo, sub: 'Referência: ' + vq.referencia, secao: 'VCT realizados x planejados por unidade:',
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

      // 5. VCT auditorias (resultado médio e itens não conformes por unidade)
      var au = d.vct.auditorias;
      var com = au.unidades.filter(function (u) { return u.resultado !== null; });
      var resMedio = com.length ? soma(com, function (u) { return u.resultado; }) / com.length : 0;
      var nconf = soma(au.unidades, function (u) { return u.naoConformes; });
      var cem = com.filter(function (u) { return u.resultado >= 100; }).length;
      s = lamina(pptx, ctx, { titulo: au.titulo, sub: 'Referência: ' + au.referencia, secao: 'Resultado da verificação do VCT por unidade:' });
      [[num(resMedio, 0) + '%', 'Resultado médio', resMedio >= 100 ? C.verde : C.verm], [nconf, 'Itens não conformes', nconf ? C.verm : C.verde], [cem + ' de ' + com.length, 'Unidades com 100%', cem === com.length ? C.verde : C.escuro]].forEach(function (k, j) {
        kpi(s, X0 + j * 4.2, 1.98, 3.9, 0.95, k[0], k[1], k[2], 24);
      });
      var rows = [[cab('Unidade'), cab('Resultado médio', { align: 'center' }), cab('Itens não conformes', { align: 'center' })]];
      au.unidades.forEach(function (u, j) {
        rows.push([cel(u.nome, j), cel(u.resultado === null ? '—' : num(u.resultado, 0) + '%', j, { align: 'center' }), cel(u.naoConformes, j, { align: 'center', bold: u.naoConformes > 0, color: u.naoConformes > 0 ? C.verm : C.escuro })]);
      });
      tabela(s, rows, X0, 3.1, W, [6.33, 3.0, 3.0], 0.3);

      // 6. Desvios
      var dv = d.desvios;
      var totalDv = soma(dv.porGerencia, function (g) { return g.valor; });
      s = lamina(pptx, ctx, { titulo: dv.titulo, sub: 'Referência: ' + dv.referencia, cabecalhos: [{ t: 'Nº de desvios por gerência:', x: X0, w: 6, fs: 16 }, { t: 'Desvios por situação:', x: 6.8, w: 6, fs: 16 }] });
      var ordenar = function (a) { return a.slice().sort(function (p, q) { return q.valor - p.valor; }).reverse(); };
      var g = ordenar(dv.porGerencia), sit = ordenar(dv.porSituacao);
      addBar(s, g.map(function (x) { return x.nome; }), [{ name: 'Desvios', values: g.map(function (x) { return x.valor; }) }],
        { x: X0, y: 2.55, w: 6.0, h: 4.3, barDir: 'bar', chartColors: [C.verm], catAxisLabelFontSize: 9, valAxisHidden: true, valGridLine: { style: 'none' } });
      addBar(s, sit.map(function (x) { return x.nome; }), [{ name: 'Desvios', values: sit.map(function (x) { return x.valor; }) }],
        { x: 6.8, y: 2.55, w: 6.03, h: 4.3, barDir: 'bar', chartColors: [C.escuro], catAxisLabelFontSize: 9, valAxisHidden: true, valGridLine: { style: 'none' } });
      texto(s, [{ text: String(totalDv), options: { bold: true, color: C.verm, fontSize: 28 } }, { text: '  desvios no total', options: { color: C.medio, fontSize: 12 } }], X0, 1.95, 6, 0.55, { valign: 'middle' });

      // 7. Inspeções mensais
      var ic = d.inspecoes;
      var metaT = soma(ic.unidades, function (u) { return u.meta; });
      var execT = soma(ic.unidades, function (u) { return u.executado; });
      var resT = metaT ? execT / metaT * 100 : 0;
      s = lamina(pptx, ctx, { titulo: ic.titulo, sub: 'Referência: ' + ic.referencia, cabecalhos: [{ t: 'Meta e executado por unidade:', x: X0, w: W, fs: 16 }] });
      [[metaT, 'Meta (QTD)', C.escuro], [execT, 'Executado (QTD)', C.verde], [num(resT, 0) + '%', 'Resultado', resT >= 100 ? C.verde : C.verm]].forEach(function (k, j) {
        kpi(s, X0 + j * 4.2, 1.98, 3.9, 0.95, k[0], k[1], k[2], 24);
      });
      var ri = [[cab('Unidade de serviço'), cab('Meta (QTD)', { align: 'center' }), cab('Executado (QTD)', { align: 'center' }), cab('Resultado', { align: 'center' }), cab('Variação', { align: 'center' })]];
      ic.unidades.forEach(function (u, j) {
        ri.push([cel(u.nome, j), cel(u.meta, j, { align: 'center' }), cel(u.executado, j, { align: 'center' }), cel(num(u.resultado, 0) + '%', j, { align: 'center' }), cel(sinal(u.resultado - 100, 0) + '%', j, { align: 'center', bold: u.resultado < 100, color: u.resultado < 100 ? C.verm : C.escuro })]);
      });
      tabela(s, ri, X0, 3.1, W, [4.33, 2.0, 2.0, 2.0, 2.0], 0.3);

      return pptx;
    });
  }

  function baixarApresentacao(dados) {
    var nome = 'Forum_Seguranca_' + String(dados.meta.periodo).trim().replace(/\s+/g, '_') + '.pptx';
    return construirApresentacao(dados, {}).then(function (pptx) {
      return pptx.writeFile({ fileName: nome });
    });
  }

  var alvo = typeof window !== 'undefined' ? window : this;
  alvo.construirApresentacao = construirApresentacao;
  alvo.baixarApresentacao = baixarApresentacao;
})();
