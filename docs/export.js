(function () {
  'use strict';

  // Exportação clean alinhada às referências de sismografia.
  var C = {
    barra: 'FFFFFF', vermelho: 'B20F20', escuro: '42464B', medio: '8D9399',
    texto: '4A4F54', linha: 'D9DADC', branco: 'FFFFFF', alerta: 'B20F20', ardosia: '42464B',
    amarelo: 'E2B2B6', cinza: '8D9399'
  };
  var FONT = 'Arial';
  var X0 = 0.5, W = 12.33, LARG = 13.333;

  function soma(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }
  function num(v, casas) { return Number(v).toFixed(casas || 0).replace('.', ','); }
  function sinal(v, casas) { return (v > 0 ? '+' : '') + num(v, casas) + '%'; }

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

  function obterLogo(opcoes) {
    if (opcoes && opcoes.logo) return Promise.resolve(opcoes.logo);
    return buscarImagem('assets/enaex-export.png');
  }

  function texto(s, t, x, y, w, h, o) {
    var op = { x: x, y: y, w: w, h: h, fontFace: FONT, fontSize: 12, color: C.escuro, margin: 0, valign: 'top' };
    for (var k in o) op[k] = o[k];
    s.addText(t, op);
  }

  function retangulo(s, x, y, w, h, cor, linhaCor) {
    s.addShape('rect', { x: x, y: y, w: w, h: h, fill: { color: cor || C.branco }, line: linhaCor ? { color: linhaCor, width: 0.75 } : { type: 'none' } });
  }

  // Cabeçalho branco, título vermelho à esquerda e subtítulo em cinza.
  function lamina(pptx, ctx, o) {
    var s = pptx.addSlide();
    s.background = { color: C.branco };
    ctx.slides.push(s);
    texto(s, String(o.titulo || '').toLocaleUpperCase('pt-BR'), X0, 0.42, 9.3, 0.55, { fontSize: 27, color: C.vermelho, valign: 'middle' });
    texto(s, o.sub, X0, 1.0, W, 0.36, { fontSize: 15, color: C.texto, valign: 'middle' });
    texto(s, o.fonte || '', X0, 7.08, 8.8, 0.25, { fontSize: 7, color: C.medio });
    texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 7.08, W, 0.25, { fontSize: 8, color: C.medio, align: 'right' });
    return s;
  }

  function cartao(s, x, y, w, h, valor, rotulo, sub, cor) {
    s.addShape('line', { x, y: y + h, w, h: 0, line: { color: C.linha, width: 0.7 } });
    texto(s, rotulo, x + 0.12, y + 0.08, w - 0.24, 0.28, { fontSize: 10, color: C.medio, align: 'center' });
    texto(s, String(valor), x + 0.12, y + 0.34, w - 0.24, 0.4, { fontSize: 22, bold: true, color: cor || C.escuro, align: 'center', valign: 'middle' });
    if (sub) texto(s, sub, x + 0.12, y + h - 0.3, w - 0.24, 0.25, { fontSize: 9, color: C.texto, align: 'center' });
  }

  function linhaCartoes(s, y, h, cartoes) {
    var gap = 0.15;
    var w = (W - gap * (cartoes.length - 1)) / cartoes.length;
    cartoes.forEach(function (c, i) {
      cartao(s, X0 + i * (w + gap), y, w, h, c.valor, c.rotulo, c.sub, c.cor);
    });
  }

  function opcChart(extra) {
    var o = {
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT, dataLabelFontFace: FONT,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, catAxisLabelColor: C.escuro, valAxisLabelColor: C.escuro,
      valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showLegend: false, legendFontFace: FONT, legendFontSize: 10, legendColor: C.escuro,
      showValue: true, dataLabelFontBold: true, dataLabelFontSize: 9, dataLabelColor: C.escuro, dataLabelPosition: 'outEnd',
      barGapWidthPct: 50
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  function complemento(pptx, ctx, p, fonte) {
    var s = lamina(pptx, ctx, { titulo: p.titulo, sub: p.referencia || 'Fonte exclusiva: planilha do Google Drive', fonte: fonte });
    if (p.linhas && p.linhas.length) {
      var rows = [p.colunas].concat(p.linhas.map(function (r) { return r.map(function (v) { return v == null ? 'Sem dados' : String(v); }); }));
      s.addTable(rows, { x: X0, y: 1.8, w: W, h: 3.5, colW: [7.0, 2.65, 2.68],
        fontFace: FONT, fontSize: 10, color: C.escuro, margin: 0.04,
        border: { type: 'none' },
        rowH: 0.25, autoPage: false, bold: false });
      s.addShape('line', { x: X0, y: 5.55, w: W, h: 0, line: { color: C.linha, width: 0.7 } });
      texto(s, p.nota, X0, 5.65, W, 0.8, { fontSize: 10, color: C.texto });
    } else if (p.itens && p.itens.length) {
      var itens = p.itens.slice().sort(function (a, b) { return a.valor - b.valor; });
      s.addChart('bar', [{ name: 'Kaizens', labels: itens.map(function (x) { return x.nome; }), values: itens.map(function (x) { return x.valor; }) }],
        opcChart({ x: X0, y: 1.95, w: W, h: 4.2, barDir: 'bar', chartColors: [C.ardosia], dataLabelFormatCode: '0', valAxisMinVal: 0 }));
      texto(s, p.nota, X0, 6.35, W, 0.45, { fontSize: 11 });
    } else {
      s.addShape('line', { x: X0, y: 2.05, w: W, h: 0, line: { color: C.linha, width: 0.7 } });
      texto(s, 'Dados indisponíveis na fonte', X0, 2.5, W, 0.5, { fontSize: 22, bold: true, color: C.escuro });
      texto(s, p.nota, X0, 3.2, W, 0.9, { fontSize: 17, color: C.texto });
    }
  }

  function construirApresentacao(d, opcoes) {
    opcoes = opcoes || {};
    var Ctor = opcoes.PptxGenJS || (typeof window !== 'undefined' ? window.PptxGenJS : null);
    if (!Ctor) return Promise.reject(new Error('PptxGenJS não encontrado'));
    return obterLogo(opcoes).then(function (logo) {
      var pptx = new Ctor();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.title = d.meta.evento + ' - ' + d.meta.periodo;
      var ctx = { logo: logo, dim: tamanhoPng(logo), slides: [] };
      var logoHe = 0.62, logoW = logoHe * ctx.dim.w / ctx.dim.h;
      var fonte = d.meta.aviso;
      var s;

      // 1. Pauta
      s = lamina(pptx, ctx, { titulo: 'Pautas do fórum', sub: 'Principais assuntos que serão abordados na reunião · ' + d.meta.periodo, fonte: fonte });
      var metade = Math.ceil(d.pauta.length / 2);
      [d.pauta.slice(0, metade), d.pauta.slice(metade)].forEach(function (col, c) {
        var partes = [];
        col.forEach(function (t, j) {
          partes.push({ text: (c * metade + j + 1) + '.  ', options: { bold: true, color: C.vermelho } });
          partes.push({ text: t, options: { color: C.escuro, breakLine: true } });
        });
        texto(s, partes, X0 + c * 6.4, 2.1, 5.9, 4.6, { fontSize: 18, paraSpaceAfter: 16 });
      });

      // 2. Aderência por unidade
      var ad = d.aderencia;
      var vals = ad.unidades.map(function (u) { return u.valor; });
      var mediaAd = soma(vals, function (v) { return v; }) / vals.length;
      var atingiu = ad.unidades.filter(function (u) { return u.valor >= ad.meta; }).map(function (u) { return u.nome; });
      var abaixo = ad.unidades.filter(function (u) { return u.valor < ad.meta; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: 'Aderência de treinamentos obrigatórios', sub: 'Aderência por unidade (%). Referência: ' + ad.referencia + '.', fonte: fonte });
      linhaCartoes(s, 1.9, 1.0, [
        { valor: num(ad.meta, 0) + '%', rotulo: 'Meta' },
        { valor: num(mediaAd, 2) + '%', rotulo: 'Aderência média', sub: 'média simples das unidades', cor: mediaAd >= ad.meta ? C.escuro : C.alerta },
        { valor: atingiu.length + ' de ' + vals.length, rotulo: 'Unidades na meta', cor: abaixo.length ? C.alerta : C.escuro },
        { valor: abaixo.length, rotulo: 'Abaixo da meta', sub: abaixo.length ? abaixo.join(', ') : 'nenhuma unidade', cor: abaixo.length ? C.alerta : C.escuro }
      ]);
      var cats = ad.unidades.map(function (u) { return u.nome; });
      var metaSerie = cats.map(function () { return ad.meta; });
      s.addChart('bar', [
        { name: 'Atingiu a meta', labels: cats, values: vals.map(function (v) { return v >= ad.meta ? v : 0; }) },
        { name: 'Abaixo da meta', labels: cats, values: vals.map(function (v) { return v < ad.meta ? v : 0; }) }
      ], opcChart({ x: X0, y: 3.05, w: W, h: 3.85,
        chartColors: [C.ardosia, C.alerta], barGrouping: 'stacked',
        showLegend: true, legendPos: 'b', valAxisMinVal: 0, valAxisMaxVal: 110,
        valAxisMajorUnit: 20, valAxisLabelFormatCode: '0"%"',
        dataLabelFormatCode: '0.00"%";-0.00"%";;',
        dataLabelPosition: 'inEnd', dataLabelColor: C.branco,
        catAxisLabelFontSize: 9, barGapWidthPct: 60 }));

      // 3. VCT quantidades por unidade
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
      s = lamina(pptx, ctx, { titulo: 'VCT · Verificação do ciclo do trabalho', sub: 'Quantidades realizadas por unidade. Referência: ' + vq.referencia + '.', fonte: fonte });
      linhaCartoes(s, 1.9, 1.0, [
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
        opcChart({ x: X0, y: 3.05, w: W, h: 3.35, chartColors: [C.alerta, C.amarelo, C.cinza, C.ardosia], showLegend: true, legendPos: 'b',
          valAxisMinVal: 0, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0', dataLabelFormatCode: '0', barGapWidthPct: 40, catAxisLabelFontSize: 9, dataLabelFontSize: 8 }));
      texto(s, [{ text: 'Atenção, ', options: { bold: true, color: C.escuro } },
        { text: abaixoVct.length ? 'unidades abaixo do planejado: ' + abaixoVct.join('; ') + '.' : 'todas as unidades atingiram o planejado.', options: { color: C.texto } }],
        X0, 6.5, W, 0.4, { fontSize: 11 });

      complemento(pptx, ctx, d.auditorias, fonte);

      // 5. Desvios por gerência (unidade)
      var dv = d.desvios;
      var totalDv = soma(dv.unidades, function (x) { return x.valor; });
      s = lamina(pptx, ctx, { titulo: 'Nº de desvios por gerência e categoria', sub: 'Dados referentes ao mês de ' + dv.referencia + '.', fonte: fonte });
      linhaCartoes(s, 1.9, 1.0, [{ valor: totalDv, rotulo: 'Total de desvios no mês', cor: C.alerta }]);
      var ordem = dv.unidades.slice().sort(function (a, b) { return a.valor - b.valor; });
      s.addChart('bar',
        [{ name: 'Desvios', labels: ordem.map(function (x) { return x.nome; }), values: ordem.map(function (x) { return x.valor; }) }],
        opcChart({ x: X0, y: 3.05, w: W, h: 3.35, barDir: 'bar', chartColors: [C.ardosia], valAxisHidden: true,
          dataLabelFormatCode: '0', dataLabelPosition: 'outEnd', catAxisLabelFontSize: 10, dataLabelFontSize: 10, barGapWidthPct: 40 }));

      texto(s, 'Categoria: sem dados na planilha. Registros agregados por unidade de serviço.', X0, 6.5, W, 0.3, { fontSize: 11 });
      complemento(pptx, ctx, d.gut, fonte);
      complemento(pptx, ctx, d.okr, fonte);
      complemento(pptx, ctx, d.kaizen, fonte);
      // Coloca a marca no topo da pilha de objetos para manter a renderização
      // consistente mesmo em slides com tabelas e gráficos nativos.
      ctx.slides.forEach(function (slide) {
        slide.addImage({ data: ctx.logo, x: 12.83 - logoW, y: 0.33, w: logoW, h: logoHe });
      });
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
