(function () {
  'use strict';

  // Exportação no padrão visual das lâminas de referência (Pressão Acústica / Vibração
  // por Categoria, US Vale Verde): fundo branco, título vermelho, filetes finos e sem bordas.
  // Medidas extraídas do PPTX de referência: página 13,333 x 8,527 pol.
  var C = {
    branco: 'FFFFFF', vermelho: 'B5121B', escuro: '3E4349', texto: '3E4349',
    medio: '8A9098', linha: 'C4C8CD', rosa: 'E3B5B9', cinza: '8A9098',
    ardosia: '3D4248', alerta: 'B5121B', claro: 'C3C6CB'
  };
  var FONT = 'Arial';
  var LAYOUT = 'REFERENCIA';
  var PAG_W = 13.333, PAG_H = 8.527;
  var X0 = 0.45, W = 12.433;

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
    var vv = opcoes.logoVV ? Promise.resolve(opcoes.logoVV) : buscarImagem('assets/vale-verde.png');
    return Promise.all([enaex, vv]).then(function (r) { return { enaex: r[0], vv: r[1] }; });
  }

  function texto(s, t, x, y, w, h, o) {
    var op = { x: x, y: y, w: w, h: h, fontFace: FONT, fontSize: 13, color: C.texto, margin: 0, valign: 'top' };
    for (var k in o) op[k] = o[k];
    s.addText(t, op);
  }

  function filete(s, x, y, w, cor, espessura) {
    s.addShape('line', { x: x, y: y, w: w, h: 0, line: { color: cor || C.linha, width: espessura || 0.75 } });
  }

  // Cabeçalho: título vermelho, subtítulo cinza-escuro, logos à direita.
  // Rodapé: fonte à esquerda, "STRICTLY PRIVATE AND CONFIDENTIAL" à direita e filete escuro acima.
  function lamina(pptx, ctx, o) {
    var s = pptx.addSlide();
    s.background = { color: C.branco };
    ctx.slides.push(s);
    texto(s, String(o.titulo || '').toLocaleUpperCase('pt-BR'), X0, 0.5, 9.0, 0.42, { fontSize: 22, color: C.vermelho });
    texto(s, o.sub || '', X0, 0.93, 10.0, 0.3, { fontSize: 13, color: C.texto });
    if (o.secao) {
      texto(s, o.secao, X0, 1.62, W, 0.3, { fontSize: 15, color: C.texto });
      filete(s, X0, 1.98, W, C.linha, 0.75);
    }
    s.addShape('rect', { x: X0, y: 7.98, w: W, h: 0.02, fill: { color: C.escuro }, line: { type: 'none' } });
    texto(s, o.fonte || '', X0, 8.1, 8.8, 0.2, { fontSize: 8, color: C.medio });
    texto(s, 'STRICTLY PRIVATE AND CONFIDENTIAL', X0, 8.1, W, 0.2, { fontSize: 9, color: C.escuro, align: 'right' });
    return s;
  }

  // Indicadores sem cartões: valor grande, rótulo e detalhe, alinhados à esquerda.
  function indicadores(s, y, itens) {
    var colW = W / itens.length;
    itens.forEach(function (c, i) {
      var x = X0 + i * colW;
      texto(s, c.rotulo, x, y, colW - 0.2, 0.25, { fontSize: 12, color: C.texto });
      texto(s, String(c.valor), x, y + 0.27, colW - 0.2, 0.5, { fontSize: 26, bold: true, color: c.cor || C.escuro });
      if (c.sub) texto(s, c.sub, x, y + 0.8, colW - 0.2, 0.25, { fontSize: 10, color: C.medio });
    });
  }

  // Gráficos: sem grade, sem eixo de valores, eixo de categorias em cinza-claro, rótulos em negrito.
  function opcChart(extra) {
    var o = {
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: 11, catAxisLabelColor: C.escuro,
      catAxisLineShow: true, catAxisLineColor: C.linha, catAxisLineSize: 1,
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showLegend: false, legendFontFace: FONT, legendFontSize: 11, legendColor: C.escuro,
      showValue: true, dataLabelFontFace: FONT, dataLabelFontBold: true, dataLabelFontSize: 11,
      dataLabelColor: C.escuro, dataLabelPosition: 'outEnd', barGapWidthPct: 60
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  function complemento(pptx, ctx, p, fonte) {
    var s = lamina(pptx, ctx, { titulo: p.titulo, sub: p.referencia || 'Fonte exclusiva: planilha do Google Drive',
      secao: p.secao || 'Resultados por unidade:', fonte: fonte });
    if (p.linhas && p.linhas.length) {
      var rows = [p.colunas].concat(p.linhas.map(function (r) { return r.map(function (v) { return v == null ? 'Sem dados' : String(v); }); }));
      var rowH = 0.32;
      s.addTable(rows.map(function (r, i) {
        return r.map(function (c) {
          return { text: c, options: { bold: i === 0, color: C.escuro, fontSize: i === 0 ? 12 : 12 } };
        });
      }), { x: X0, y: 2.15, w: W, colW: [7.0, 2.65, 2.783], fontFace: FONT, margin: [0.03, 0.05, 0.03, 0.05],
        border: { type: 'none' }, rowH: rowH, autoPage: false });
      filete(s, X0, 2.15 + rowH, W, C.linha, 0.75);
      texto(s, p.nota, X0, 7.02, W, 0.8, { fontSize: 13, align: 'justify' });
    }
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
      var ctx = { logos: logos, slides: [] };
      var fonte = d.meta.aviso;
      var s;

      // 1. Pauta
      s = lamina(pptx, ctx, { titulo: 'Pautas do fórum', sub: 'Principais assuntos que serão abordados na reunião · ' + d.meta.periodo,
        secao: 'Temas da reunião:', fonte: fonte });
      var metade = Math.ceil(d.pauta.length / 2);
      [d.pauta.slice(0, metade), d.pauta.slice(metade)].forEach(function (col, c) {
        var partes = [];
        col.forEach(function (t, j) {
          partes.push({ text: (c * metade + j + 1) + '.  ', options: { bold: true, color: C.vermelho } });
          partes.push({ text: t, options: { color: C.escuro, breakLine: true } });
        });
        texto(s, partes, X0 + c * 6.35, 2.2, 5.9, 4.6, { fontSize: 16, paraSpaceAfter: 14 });
      });

      // 2. Aderência por unidade
      var ad = d.aderencia;
      var vals = ad.unidades.map(function (u) { return u.valor; });
      var mediaAd = soma(vals, function (v) { return v; }) / vals.length;
      var atingiu = ad.unidades.filter(function (u) { return u.valor >= ad.meta; }).map(function (u) { return u.nome; });
      var abaixo = ad.unidades.filter(function (u) { return u.valor < ad.meta; }).map(function (u) { return u.nome; });
      s = lamina(pptx, ctx, { titulo: 'Aderência de treinamentos obrigatórios', sub: 'Aderência por unidade (%). Referência: ' + ad.referencia + '.',
        secao: 'Aderência por unidade (%):', fonte: fonte });
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
        catAxisLabelFontSize: 11, barGapWidthPct: 60 }));

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
      s = lamina(pptx, ctx, { titulo: 'VCT · Verificação do ciclo do trabalho', sub: 'Quantidades realizadas por unidade. Referência: ' + vq.referencia + '.',
        secao: 'Quantidades realizadas e planejadas por unidade:', fonte: fonte });
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
          catAxisLabelFontSize: 10, catAxisLabelRotate: 0, dataLabelFontSize: 10 }));
      texto(s, [{ text: 'Atenção, ', options: { bold: true, color: C.escuro } },
        { text: abaixoVct.length ? 'unidades abaixo do planejado: ' + abaixoVct.join('; ') + '.' : 'todas as unidades atingiram o planejado.', options: { color: C.texto } }],
        X0, 7.02, W, 0.8, { fontSize: 13, align: 'justify' });

      if (d.auditorias.linhas && d.auditorias.linhas.length) complemento(pptx, ctx, d.auditorias, fonte);

      // 4. Desvios por gerência (unidade)
      var dv = d.desvios;
      var totalDv = soma(dv.unidades, function (x) { return x.valor; });
      s = lamina(pptx, ctx, { titulo: 'Nº de desvios por gerência e categoria', sub: 'Dados referentes ao mês de ' + dv.referencia + '.',
        secao: 'Nº de desvios por unidade:', fonte: fonte });
      indicadores(s, 2.15, [{ valor: totalDv, rotulo: 'Total de desvios no mês', cor: C.alerta }]);
      var ordem = dv.unidades.slice().sort(function (a, b) { return a.valor - b.valor; });
      s.addChart('bar',
        [{ name: 'Desvios', labels: ordem.map(function (x) { return x.nome; }), values: ordem.map(function (x) { return x.valor; }) }],
        opcChart({ x: X0, y: 3.5, w: W, h: 3.45, barDir: 'bar', chartColors: [C.ardosia],
          dataLabelFormatCode: '0', dataLabelPosition: 'outEnd', catAxisLabelFontSize: 11, dataLabelFontSize: 11, barGapWidthPct: 40 }));


      // Logos no canto superior direito de todas as lâminas (Enaex e Mineração Vale Verde)
      ctx.slides.forEach(function (slide) {
        slide.addImage({ data: logos.enaex, x: 9.79, y: 0.4, w: 1.57, h: 0.5 });
        slide.addImage({ data: logos.vv, x: 11.71, y: 0.4, w: 1.17, h: 0.5 });
      });
      return pptx;
    });
  }

  function baixarApresentacao(dados) {
    var nome = 'Forum_Seguranca_' + String(dados.meta.periodo).trim().replace(/\s+/g, '_') + '.pptx';
    // O writeFile do PptxGenJS revoga a URL do blob em 100 ms, antes de o Chrome terminar
    // o download (o arquivo ficava como .tmp). Aqui a URL só é revogada depois de 60 s.
    return construirApresentacao(dados, {}).then(function (pptx) {
      return pptx.write({ outputType: 'blob' });
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
      return nome;
    });
  }

  var alvo = typeof window !== 'undefined' ? window : this;
  alvo.construirApresentacao = construirApresentacao;
  alvo.baixarApresentacao = baixarApresentacao;
})();
