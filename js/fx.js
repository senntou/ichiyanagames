/* いちやなぎ一閃 — 演出・描画（window.IchiFX）。Canvas2D のみ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var C = { washi: '#f2ead8', sumi: '#1a1612', shu: '#d7381f', gold: '#c9a227', yanagi: '#5b7f3a', ai: '#2b3a5c' };
  var FONT_BRUSH = '"Yuji Boku","Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP",serif';
  var FONT_BOLD = '"Dela Gothic One","Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif';

  var FX = { FONT_BRUSH: FONT_BRUSH, FONT_BOLD: FONT_BOLD, COLORS: C };

  var W = 0, H = 0, U = 1, DPR = 1, ready = false;
  var fontGen = 0;            // フォント読み込みで文字キャッシュを作り直すための世代
  var lastNow = 0, clock = 0;

  // ---------------------------------------------------------------- 小道具
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function easeOut(t) { t = 1 - clamp(t, 0, 1); return 1 - t * t * t; }
  function easeIn(t) { t = clamp(t, 0, 1); return t * t * t; }
  function easeOutBack(t) { t = clamp(t, 0, 1) - 1; return 1 + t * t * (2.7 * t + 1.7); }
  function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    return c;
  }
  function chars(s) { return Array.from ? Array.from(s) : s.split(''); }

  var rgbCache = {};
  function toRgb(c) {
    var v = rgbCache[c]; if (v) return v;
    var m; v = [26, 22, 18];
    if (typeof c === 'string') {
      if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { var n = parseInt(m[1], 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
      else if ((m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c))) v = [parseInt(m[1], 16) * 17, parseInt(m[2], 16) * 17, parseInt(m[3], 16) * 17];
      else if ((m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(c))) v = [+m[1], +m[2], +m[3]];
    }
    rgbCache[c] = v; return v;
  }
  function mix(a, b, t) {
    var A = toRgb(a), B = toRgb(b); t = clamp(t, 0, 1);
    return 'rgb(' + ((A[0] + (B[0] - A[0]) * t) | 0) + ',' + ((A[1] + (B[1] - A[1]) * t) | 0) + ',' + ((A[2] + (B[2] - A[2]) * t) | 0) + ')';
  }
  function rgba(c, a) { var A = toRgb(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }

  // 筆の帯: RX,RY(中心線) と RW(半幅) から多角形を塗る
  var RMAX = 420;
  var RX = new Float32Array(RMAX), RY = new Float32Array(RMAX), RW = new Float32Array(RMAX);
  var NX = new Float32Array(RMAX), NY = new Float32Array(RMAX), RS = new Float32Array(RMAX), RA = new Float32Array(RMAX);
  function fillRibbon(ctx, n) {
    if (n < 2) return;
    var i, a, b, dx, dy, l;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      a = i > 0 ? i - 1 : 0; b = i < n - 1 ? i + 1 : n - 1;
      dx = RX[b] - RX[a]; dy = RY[b] - RY[a]; l = Math.sqrt(dx * dx + dy * dy) || 1;
      NX[i] = -dy / l; NY[i] = dx / l;
      if (i === 0) ctx.moveTo(RX[i] + NX[i] * RW[i], RY[i] + NY[i] * RW[i]);
      else ctx.lineTo(RX[i] + NX[i] * RW[i], RY[i] + NY[i] * RW[i]);
    }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(RX[i] - NX[i] * RW[i], RY[i] - NY[i] * RW[i]);
    ctx.closePath(); ctx.fill();
  }
  function quadRibbon(ctx, x0, y0, cx, cy, x1, y1, w0, w1, n) {
    n = n || 10;
    for (var i = 0; i <= n; i++) {
      var f = i / n, g = 1 - f;
      RX[i] = g * g * x0 + 2 * g * f * cx + f * f * x1;
      RY[i] = g * g * y0 + 2 * g * f * cy + f * f * y1;
      RW[i] = lerp(w0, w1, f);
    }
    fillRibbon(ctx, n + 1);
  }
  // 両端のとがった閃光
  function lens(ctx, x1, y1, x2, y2, hw) {
    var dx = x2 - x1, dy = y2 - y1, l = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / l * hw * 2, ny = dx / l * hw * 2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2);
    ctx.quadraticCurveTo(mx - nx, my - ny, x1, y1);
    ctx.fill();
  }

  // ---------------------------------------------------------------- 文字スプライト
  function textSprite(cv, text, o) {
    var s = Math.min(DPR, 2), px = o.px, sw = o.sw || 0, pad = px * 0.3 + sw;
    var g = cv.getContext('2d'), cs = chars(text), vert = !!o.vertical, pitch = px * 1.06;
    g.font = px + 'px ' + o.font;
    var tw = vert ? px : Math.max(px * 0.5, g.measureText(text).width);
    var th = vert ? pitch * cs.length : px * 1.15;
    var w = tw + pad * 2, h = th + pad * 2;
    while ((w * s > 4096 || h * s > 4096) && s > 0.25) s *= 0.75;
    cv.width = Math.ceil(w * s); cv.height = Math.ceil(h * s);
    g = cv.getContext('2d');
    g.setTransform(s, 0, 0, s, 0, 0);
    g.font = px + 'px ' + o.font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    function put(stroke, dx, dy) {
      if (vert) {
        for (var i = 0; i < cs.length; i++) {
          var yy = pad + pitch * (i + 0.5) + dy;
          if (stroke) g.strokeText(cs[i], w / 2 + dx, yy); else g.fillText(cs[i], w / 2 + dx, yy);
        }
      } else if (stroke) g.strokeText(text, w / 2 + dx, h / 2 + dy);
      else g.fillText(text, w / 2 + dx, h / 2 + dy);
    }
    if (o.shadow) { g.fillStyle = o.shadow; put(false, o.sox || 0, o.soy || 0); }
    if (o.stroke && sw > 0) { g.strokeStyle = o.stroke; g.lineWidth = sw; put(true, 0, 0); }
    g.fillStyle = o.fill; put(false, 0, 0);
    if (o.bold > 0) { g.strokeStyle = o.fill; g.lineWidth = px * o.bold; put(true, 0, 0); } // 細い代替フォントでも痩せないように
    if (o.kasure) { // 筆のかすれを少し抜く
      var R = mulberry(911);
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      for (var k = 0; k < 16; k++) {
        var x = R() * w, y = pad + R() * th, len = px * (0.25 + R() * 0.6);
        g.globalAlpha = 0.18 + R() * 0.3; g.lineWidth = px * (0.006 + R() * 0.012);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y - len * 0.22); g.stroke();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    return { cv: cv, w: w, h: h };
  }

  var kanaCache = {}, kanaCount = 0, KANA_PX = 120;
  function kanaSprite(ch, fill, stroke) {
    var key = ch + '|' + fill + '|' + stroke + '|' + fontGen, s = kanaCache[key];
    if (s) return s;
    if (kanaCount > 60) { kanaCache = {}; kanaCount = 0; }
    s = textSprite(makeCanvas(2, 2), ch, { font: FONT_BRUSH, px: KANA_PX, fill: fill, stroke: stroke, sw: KANA_PX * 0.11 });
    kanaCache[key] = s; kanaCount++;
    return s;
  }

  // ---------------------------------------------------------------- 墨の染みスプライト
  var splatCache = {}, splatCount = 0, SPLAT_VAR = 3;
  function splatSprite(color, v) {
    var key = color + '|' + v, cv = splatCache[key];
    if (cv) return cv;
    if (splatCount > 36) { splatCache = {}; splatCount = 0; }
    var S = 128, R = mulberry(101 + v * 37), i, a, d;
    cv = makeCanvas(S, S);
    var g = cv.getContext('2d');
    g.translate(S / 2, S / 2); g.fillStyle = color;
    var n = 14, px = [], py = [];
    for (i = 0; i < n; i++) { a = i / n * TAU; d = S * (0.19 + R() * 0.11); px.push(Math.cos(a) * d); py.push(Math.sin(a) * d); }
    g.globalAlpha = 0.9; g.beginPath();
    g.moveTo((px[n - 1] + px[0]) / 2, (py[n - 1] + py[0]) / 2);
    for (i = 0; i < n; i++) { var j = (i + 1) % n; g.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2); }
    g.fill();
    for (i = 0; i < 9; i++) { // 棘と滴
      a = R() * TAU; var d0 = S * 0.2, d1 = S * (0.3 + R() * 0.16);
      g.beginPath();
      g.moveTo(Math.cos(a - 0.13) * d0, Math.sin(a - 0.13) * d0);
      g.lineTo(Math.cos(a) * d1, Math.sin(a) * d1);
      g.lineTo(Math.cos(a + 0.13) * d0, Math.sin(a + 0.13) * d0);
      g.fill();
      g.beginPath(); g.arc(Math.cos(a) * (d1 + 1), Math.sin(a) * (d1 + 1), S * (0.014 + R() * 0.024), 0, TAU); g.fill();
    }
    for (i = 0; i < 12; i++) {
      a = R() * TAU; d = S * (0.3 + R() * 0.18);
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, S * (0.006 + R() * 0.014), 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    for (i = 0; i < 5; i++) {
      g.globalAlpha = 0.1 + R() * 0.14;
      g.beginPath(); g.arc((R() - 0.5) * S * 0.3, (R() - 0.5) * S * 0.3, S * (0.04 + R() * 0.08), 0, TAU); g.fill();
    }
    splatCache[key] = cv; splatCount++;
    return cv;
  }

  // ---------------------------------------------------------------- 背景
  var BGM = 32;               // 揺れで縁が見えないための余白
  var bg = null, bgDirty = true, bgScale = 1, horizon = 0;
  var mistCv = null, vigCache = {};

  function vignette(color) {
    var cv = vigCache[color]; if (cv) return cv;
    cv = makeCanvas(128, 128);
    var g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 44, 64, 64, 92);
    gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.55, rgba(color, 0.32)); gr.addColorStop(1, rgba(color, 0.95));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    vigCache[color] = cv; return cv;
  }

  function buildBackground() {
    var s = Math.min(DPR, 1.5), m = BGM;
    var cw = Math.ceil((W + 2 * m) * s), ch = Math.ceil((H + 2 * m) * s);
    if (!bg) bg = makeCanvas(cw, ch); else { bg.width = cw; bg.height = ch; }
    bgScale = s;
    var g = bg.getContext('2d'), R = mulberry(20240613), i, x, y;
    g.setTransform(s, 0, 0, s, m * s, m * s);
    var x0 = -m, y0 = -m, ww = W + 2 * m, hh = H + 2 * m;
    var MU = U * (H > W ? 1.4 : 1);
    horizon = H * (H > W ? 0.36 : 0.42);

    g.fillStyle = C.washi; g.fillRect(x0, y0, ww, hh);
    // 和紙のむら
    for (i = 0; i < 18; i++) {
      x = x0 + R() * ww; y = y0 + R() * hh; var br = MU * (18 + R() * 40);
      var gr = g.createRadialGradient(x, y, 0, x, y, br), warm = R() < 0.6;
      gr.addColorStop(0, warm ? 'rgba(165,128,70,0.075)' : 'rgba(255,252,242,0.4)');
      gr.addColorStop(1, warm ? 'rgba(165,128,70,0)' : 'rgba(255,252,242,0)');
      g.fillStyle = gr; g.fillRect(x - br, y - br, br * 2, br * 2);
    }
    // 繊維
    var nf = clamp(ww * hh / 1500, 260, 1100) | 0;
    g.lineCap = 'round';
    for (i = 0; i < nf; i++) {
      x = x0 + R() * ww; y = y0 + R() * hh;
      var a = R() * TAU, len = 4 + R() * 22, bend = (R() - 0.5) * 10;
      g.strokeStyle = R() < 0.35 ? 'rgba(255,255,250,' + (0.25 + R() * 0.3) + ')' : 'rgba(120,92,52,' + (0.04 + R() * 0.09) + ')';
      g.lineWidth = 0.4 + R() * 0.9;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + bend, y + Math.sin(a) * len * 0.5 - bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    for (i = 0; i < nf; i++) {
      g.fillStyle = 'rgba(100,75,40,' + (0.05 + R() * 0.1) + ')';
      g.fillRect(x0 + R() * ww, y0 + R() * hh, 0.6 + R() * 1.2, 0.6 + R() * 1.2);
    }

    // 日輪
    var sx = W * 0.77, sy = horizon - MU * 21, sr = MU * 8.5;
    var sg = g.createRadialGradient(sx, sy, sr * 0.9, sx, sy, sr * 2.2);
    sg.addColorStop(0, 'rgba(215,56,31,0.13)'); sg.addColorStop(1, 'rgba(215,56,31,0)');
    g.fillStyle = sg; g.fillRect(sx - sr * 2.2, sy - sr * 2.2, sr * 4.4, sr * 4.4);
    g.fillStyle = 'rgba(206,52,30,0.82)'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out'; // 日輪にも紙のかすれ
    for (i = 0; i < 60; i++) {
      g.globalAlpha = 0.05 + R() * 0.12;
      g.fillRect(sx - sr + R() * sr * 2, sy - sr + R() * sr * 2, 2 + R() * sr * 0.5, 0.6 + R());
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = C.washi; g.fillRect(sx - sr * 2.3, sy + sr * 0.42, sr * 4.6, sr * 0.09);

    // 遠景の山（三層、裾は霞に溶ける）
    var layers = [
      { col: '86,96,116', a: 0.34, amp: 19, base: 0, f: 0.75 },
      { col: '58,62,78', a: 0.46, amp: 13, base: 4.5, f: 1.25 },
      { col: '30,27,24', a: 0.62, amp: 8.5, base: 9.5, f: 1.9 }
    ];
    for (var li = 0; li < layers.length; li++) {
      var L = layers[li], p1 = R() * TAU, p2 = R() * TAU, p3 = R() * TAU, p4 = R() * TAU;
      var by = horizon + L.base * MU, amp = L.amp * MU, top = by, step = 5, xs = [], ys = [];
      for (x = x0; x <= x0 + ww + step; x += step) {
        var q = x / Math.max(W, 1) * Math.PI * L.f;
        var hgt = 0.56 * Math.pow(1 - Math.abs(Math.sin(q + p1)), 1.35) + 0.3 * (1 - Math.abs(Math.sin(q * 2.3 + p2)))
          + 0.1 * Math.sin(q * 6.1 + p3) + 0.035 * Math.sin(q * 17 + p4);
        y = by - amp * hgt; xs.push(x); ys.push(y); if (y < top) top = y;
      }
      var foot = by + MU * 7;
      var mg = g.createLinearGradient(0, top, 0, foot);
      mg.addColorStop(0, 'rgba(' + L.col + ',' + L.a + ')');
      mg.addColorStop(0.5, 'rgba(' + L.col + ',' + (L.a * 0.5) + ')');
      mg.addColorStop(1, 'rgba(' + L.col + ',0)');
      g.fillStyle = mg; g.beginPath(); g.moveTo(xs[0], foot);
      for (i = 0; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
      g.lineTo(xs[xs.length - 1], foot); g.closePath(); g.fill();
      // 稜線の筆と皴
      g.strokeStyle = 'rgba(' + L.col + ',' + (L.a * 0.55) + ')'; g.lineWidth = 0.8 + li * 0.5;
      g.beginPath(); g.moveTo(xs[0], ys[0]);
      for (i = 1; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
      g.stroke();
      g.strokeStyle = 'rgba(' + L.col + ',' + (L.a * 0.3) + ')'; g.lineWidth = 0.8;
      for (i = 0; i < xs.length; i += 2) {
        if (R() < 0.55) continue;
        var sl = amp * (0.1 + R() * 0.28);
        g.beginPath(); g.moveTo(xs[i], ys[i] + 1);
        g.lineTo(xs[i] + sl * (R() - 0.3) * 0.8, ys[i] + sl); g.stroke();
      }
    }
    // 霞
    var kg = g.createLinearGradient(0, horizon + MU * 4, 0, horizon + MU * 22);
    kg.addColorStop(0, 'rgba(242,234,216,0)'); kg.addColorStop(0.5, 'rgba(244,237,221,0.8)'); kg.addColorStop(1, 'rgba(242,234,216,0)');
    g.fillStyle = kg; g.fillRect(x0, horizon + MU * 4, ww, MU * 18);
    // 水面の筆線
    for (i = 0; i < 26; i++) {
      y = horizon + MU * 18 + R() * (H - horizon - MU * 18); x = x0 + R() * ww;
      var wl = MU * (6 + R() * 22);
      g.strokeStyle = 'rgba(60,66,84,' + (0.05 + R() * 0.07) + ')'; g.lineWidth = 0.7 + R() * 1.3;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + wl / 2, y + (R() - 0.5) * 3, x + wl, y); g.stroke();
    }
    // 遠い鳥
    g.strokeStyle = 'rgba(26,22,18,0.55)'; g.lineWidth = Math.max(1, MU * 0.22);
    for (i = 0; i < 4; i++) {
      x = W * 0.2 + i * MU * 5.2 + R() * MU * 2; y = horizon - MU * (25 + R() * 6) - i * MU * 1.1; var bw = MU * (1.5 + R() * 0.9);
      g.beginPath(); g.moveTo(x - bw, y - bw * 0.3); g.quadraticCurveTo(x - bw * 0.4, y - bw * 0.7, x, y);
      g.quadraticCurveTo(x + bw * 0.4, y - bw * 0.7, x + bw, y - bw * 0.3); g.stroke();
    }
    // 周辺減光
    var vr = Math.sqrt(ww * ww + hh * hh) / 2;
    var vg = g.createRadialGradient(W / 2, H / 2, vr * 0.5, W / 2, H / 2, vr);
    vg.addColorStop(0, 'rgba(96,68,32,0)'); vg.addColorStop(1, 'rgba(96,68,32,0.3)');
    g.fillStyle = vg; g.fillRect(x0, y0, ww, hh);
    bgDirty = false;

    if (!mistCv) {
      mistCv = makeCanvas(256, 64);
      var mg2 = mistCv.getContext('2d'); mg2.scale(4, 1);
      var mr = mg2.createRadialGradient(32, 32, 2, 32, 32, 32);
      mr.addColorStop(0, 'rgba(247,241,228,0.8)'); mr.addColorStop(1, 'rgba(247,241,228,0)');
      mg2.fillStyle = mr; mg2.fillRect(0, 0, 64, 64);
    }
  }

  // ---- 柳
  var BOUGHS = [ // 単位空間（木の全高 = 1、中心が原点）
    [-0.01, -0.16, -0.20, -0.52, -0.44, -0.30, 0.034],
    [0.0, -0.22, -0.10, -0.54, -0.25, -0.43, 0.026],
    [0.0, -0.16, 0.22, -0.52, 0.46, -0.28, 0.034],
    [0.0, -0.24, 0.12, -0.56, 0.27, -0.44, 0.026],
    [0.0, -0.22, 0.01, -0.44, 0.03, -0.50, 0.022]
  ];
  var STRANDS = [], SEG = 7;
  (function () {
    var R = mulberry(77), i, bi;
    for (bi = 0; bi < BOUGHS.length; bi++) {
      var b = BOUGHS[bi], n = bi === 4 ? 4 : (bi % 2 === 0 ? 9 : 7);
      for (i = 0; i < n; i++) {
        var f = clamp(0.3 + 0.7 * (i + R() * 0.7) / n, 0, 1), g = 1 - f;
        var ax = g * g * b[0] + 2 * g * f * b[2] + f * f * b[4], ay = g * g * b[1] + 2 * g * f * b[3] + f * f * b[5];
        var len = Math.min(0.4 + R() * 0.36, 0.47 - ay);
        STRANDS.push({ ax: ax, ay: ay, len: len, ph: R() * TAU, amp: 0.7 + R() * 0.6, side: ax < 0 ? -1 : 1, rank: 0, key: R() });
      }
    }
    var order = STRANDS.slice().sort(function (a, b) { return a.key - b.key; });
    for (i = 0; i < order.length; i++) order[i].rank = i;
  })();
  var LEAF_MAX = STRANDS.length * SEG * 3 * 4;
  var LA = new Float32Array(LEAF_MAX), LB = new Float32Array(LEAF_MAX);
  var trunk = { cv: null, size: -1, dim: 0 };

  function buildTrunk(S) {
    var s = Math.min(DPR, 2), dim = S * 1.5, px = Math.ceil(dim * s);
    if (!trunk.cv) trunk.cv = makeCanvas(px, px); else { trunk.cv.width = px; trunk.cv.height = px; }
    trunk.size = S; trunk.dim = dim;
    var g = trunk.cv.getContext('2d'), R = mulberry(31), i;
    g.setTransform(S * s, 0, 0, S * s, px / 2, px / 2);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // 根元の墨だまり
    g.save(); g.translate(0, 0.5); g.scale(1, 0.14);
    var gg = g.createRadialGradient(0, 0, 0.02, 0, 0, 0.5);
    gg.addColorStop(0, 'rgba(26,22,18,0.42)'); gg.addColorStop(0.5, 'rgba(26,22,18,0.16)'); gg.addColorStop(1, 'rgba(26,22,18,0)');
    g.fillStyle = gg; g.beginPath(); g.arc(0, 0, 0.5, 0, TAU); g.fill(); g.restore();
    // 幹
    var P = [[0.035, 0.5], [0.0, 0.4], [-0.045, 0.27], [0.03, 0.1], [0.012, -0.05], [-0.012, -0.16], [0.0, -0.25]];
    var n = 0, k, j;
    for (k = 0; k < P.length - 1; k++) {
      var a = P[k > 0 ? k - 1 : k], b = P[k], c = P[k + 1], d = P[k + 2 < P.length ? k + 2 : k + 1];
      for (j = 0; j < 6; j++) {
        var u = j / 6, u2 = u * u, u3 = u2 * u;
        RX[n] = 0.5 * (2 * b[0] + (c[0] - a[0]) * u + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * u2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * u3);
        RY[n] = 0.5 * (2 * b[1] + (c[1] - a[1]) * u + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * u2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * u3);
        n++;
      }
    }
    RX[n] = P[P.length - 1][0]; RY[n] = P[P.length - 1][1]; n++;
    var tx = [], ty = [], tw = [];
    for (i = 0; i < n; i++) {
      var f = i / (n - 1);
      RW[i] = lerp(0.052, 0.024, f) + (f < 0.16 ? (0.16 - f) * 0.36 : 0) + 0.004 * Math.sin(i * 1.7);
      tx.push(RX[i]); ty.push(RY[i]); tw.push(RW[i]);
    }
    g.fillStyle = 'rgba(26,22,18,0.16)';
    for (i = 0; i < n; i++) RW[i] *= 1.25;
    fillRibbon(g, n);
    for (i = 0; i < n; i++) RW[i] = tw[i];
    g.fillStyle = '#1f1a15'; fillRibbon(g, n);
    // 根
    quadRibbon(g, 0.0, 0.44, -0.08, 0.49, -0.17, 0.51, 0.03, 0.004, 8);
    quadRibbon(g, 0.05, 0.44, 0.12, 0.5, 0.2, 0.505, 0.03, 0.004, 8);
    // 大枝
    for (i = 0; i < BOUGHS.length; i++) {
      var B = BOUGHS[i];
      quadRibbon(g, B[0], B[1], B[2], B[3], B[4], B[5], B[6], 0.004, 14);
    }
    // 樹皮のかすれ
    for (i = 0; i < 16; i++) {
      k = 2 + ((R() * (n - 8)) | 0); var off = (R() - 0.5) * tw[k] * 1.3;
      g.strokeStyle = 'rgba(242,234,216,' + (0.14 + R() * 0.26) + ')'; g.lineWidth = 0.003 + R() * 0.005;
      g.beginPath(); g.moveTo(tx[k] + off, ty[k]); g.lineTo(tx[k + 3] + off * 0.8, ty[k + 3]); g.stroke();
    }
    g.strokeStyle = 'rgba(242,234,216,0.4)'; g.lineWidth = 0.006;
    g.beginPath(); g.ellipse(-0.012, 0.3, 0.015, 0.024, 0.3, 0, TAU); g.stroke();
    // しめ縄と紙垂
    var ry = 0.185, rx = 0.012;
    g.strokeStyle = C.sumi; g.lineWidth = 0.034;
    g.beginPath(); g.moveTo(rx - 0.066, ry - 0.004); g.quadraticCurveTo(rx, ry + 0.03, rx + 0.066, ry - 0.008); g.stroke();
    g.strokeStyle = '#e9dcbb'; g.lineWidth = 0.022;
    g.beginPath(); g.moveTo(rx - 0.066, ry - 0.004); g.quadraticCurveTo(rx, ry + 0.03, rx + 0.066, ry - 0.008); g.stroke();
    g.strokeStyle = 'rgba(26,22,18,0.5)'; g.lineWidth = 0.004;
    for (i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(rx + i * 0.018 - 0.004, ry - 0.002); g.lineTo(rx + i * 0.018 + 0.006, ry + 0.022); g.stroke(); }
    for (i = -1; i <= 1; i++) {
      var hx = rx + i * 0.04, hy = ry + 0.024 - Math.abs(i) * 0.008;
      g.beginPath(); g.moveTo(hx - 0.012, hy); g.lineTo(hx + 0.012, hy); g.lineTo(hx + 0.004, hy + 0.024); g.lineTo(hx + 0.018, hy + 0.024);
      g.lineTo(hx + 0.008, hy + 0.054); g.lineTo(hx - 0.012, hy + 0.054); g.lineTo(hx - 0.004, hy + 0.028); g.lineTo(hx - 0.016, hy + 0.028); g.closePath();
      g.fillStyle = '#fbf7ea'; g.fill(); g.strokeStyle = 'rgba(26,22,18,0.7)'; g.lineWidth = 0.004; g.stroke();
    }
    // 下草
    g.strokeStyle = 'rgba(62,84,44,0.8)';
    for (i = 0; i < 16; i++) {
      var gx = -0.3 + R() * 0.6, gy = 0.5 + (R() - 0.5) * 0.02, gh = 0.022 + R() * 0.04, lean = (R() - 0.5) * 0.05;
      g.lineWidth = 0.004 + R() * 0.004;
      g.beginPath(); g.moveTo(gx, gy); g.quadraticCurveTo(gx + lean * 0.3, gy - gh * 0.6, gx + lean, gy - gh); g.stroke();
    }
  }

  function drawWillow(ctx, t, wl, fever) {
    var S = num(wl.size, 0); if (!(S > 0)) S = U * 34;
    var x = num(wl.x, W / 2), y = num(wl.y, H * 0.6);
    var ratio = wl.maxLife > 0 ? clamp(num(wl.life, wl.maxLife) / wl.maxLife, 0, 1) : 1;
    var hurt = clamp(num(wl.hurt, 0), 0, 1);
    if (Math.abs(trunk.size - S) > 0.5) buildTrunk(S);
    ctx.drawImage(trunk.cv, x - trunk.dim / 2, y - trunk.dim / 2, trunk.dim, trunk.dim);

    var base = mix(C.yanagi, '#978c5c', (1 - ratio) * 0.85);
    if (fever) base = mix(base, '#e0b52c', 0.72);
    if (hurt > 0) base = mix(base, C.shu, hurt * (0.6 + 0.4 * Math.sin(t * 50)));
    var dark = mix(base, C.sumi, 0.38), light = mix(base, fever ? '#fff0a0' : '#a8c46c', 0.3);

    var N = STRANDS.length, aliveN = Math.round(N * ratio), na = 0, nb = 0, k, j;
    if (ratio > 0 && aliveN < 1) aliveN = 1;
    var gust = Math.sin(t * 0.37) * 0.022 + Math.sin(t * 0.83 + 1) * 0.01 + hurt * Math.sin(t * 46) * 0.012;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < N; k++) {
      var s = STRANDS[k], alive = s.rank < aliveN, L = (alive ? s.len : s.len * 0.38) * S;
      var bx = x + s.ax * S, by = y + s.ay * S, px = bx, py = by;
      ctx.moveTo(bx, by);
      for (j = 1; j <= SEG; j++) {
        var f = j / SEG;
        var sway = (Math.sin(t * 1.4 + s.ph + f * 2.4) * 0.03 + Math.sin(t * 0.53 + s.ph * 1.7) * 0.02 + gust) * f * (0.4 + f) * s.amp * S;
        var nx = bx + s.side * 0.04 * S * Math.sin(f * 1.57) + sway, ny = by + L * f;
        ctx.lineTo(nx, ny);
        if (alive) {
          var ll = S * 0.05 * (0.72 + 0.28 * Math.sin(k * 3.1 + j * 1.9)), dx = (nx - px) * 0.7;
          var buf = ((k + j) & 1) ? LB : LA, o = ((k + j) & 1) ? nb : na;
          var mx = (px + nx) / 2, my = (py + ny) / 2, sd = (j & 1) ? 1 : -1;
          buf[o] = nx; buf[o + 1] = ny; buf[o + 2] = nx + dx - ll * 0.42; buf[o + 3] = ny + ll * 0.9;
          buf[o + 4] = nx; buf[o + 5] = ny; buf[o + 6] = nx + dx + ll * 0.42; buf[o + 7] = ny + ll * 0.9;
          buf[o + 8] = mx; buf[o + 9] = my; buf[o + 10] = mx + dx + sd * ll * 0.5; buf[o + 11] = my + ll * 0.8;
          if ((k + j) & 1) nb += 12; else na += 12;
        }
        px = nx; py = ny;
      }
    }
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.7, S * 0.0055); ctx.stroke();
    ctx.lineWidth = Math.max(1.2, S * 0.0125);
    ctx.beginPath();
    for (k = 0; k < na; k += 4) { ctx.moveTo(LA[k], LA[k + 1]); ctx.lineTo(LA[k + 2], LA[k + 3]); }
    ctx.strokeStyle = dark; ctx.stroke();
    ctx.beginPath();
    for (k = 0; k < nb; k += 4) { ctx.moveTo(LB[k], LB[k + 1]); ctx.lineTo(LB[k + 2], LB[k + 3]); }
    ctx.strokeStyle = light; ctx.stroke();
    if (fever) { // 金の瞬き
      ctx.fillStyle = '#fff3b0'; ctx.beginPath();
      for (k = 0; k < nb; k += 36) {
        var tw = Math.sin(t * 7 + k * 0.7);
        if (tw > 0.3) { var d = S * 0.012 * tw, qx = LB[k + 2], qy = LB[k + 3]; ctx.moveTo(qx, qy - d * 1.8); ctx.lineTo(qx + d, qy); ctx.lineTo(qx, qy + d * 1.8); ctx.lineTo(qx - d, qy); }
      }
      ctx.fill();
    }
  }

  var lastDanger = 0, lastT = 0;
  FX.drawBackground = function (ctx, t, state) {
    if (!ctx) return;
    if (!ready) { var cv = ctx.canvas; if (cv) FX.resize(cv.clientWidth || cv.width, cv.clientHeight || cv.height); if (!ready) return; }
    t = num(t, 0); state = state || {};
    if (bgDirty) buildBackground();
    ctx.drawImage(bg, -BGM, -BGM, W + 2 * BGM, H + 2 * BGM);
    // 流れる霞
    var MU = U * (H > W ? 1.4 : 1), mw = Math.max(W * 0.75, MU * 70), mh = MU * 13, i;
    for (i = 0; i < 3; i++) {
      var sp = (8 + i * 5) * MU * 0.12, span = W + mw;
      var mx = ((t * sp + i * span * 0.37) % span) - mw;
      ctx.globalAlpha = 0.55 - i * 0.1;
      ctx.drawImage(mistCv, mx, horizon + MU * (1 + i * 6.5) - mh / 2 + Math.sin(t * 0.2 + i) * MU, mw, mh);
    }
    ctx.globalAlpha = 1;
    var wave = num(state.wave, 1), dusk = clamp((wave - 1) * 0.012, 0, 0.11);
    if (dusk > 0.01) { ctx.fillStyle = rgba(C.ai, dusk); ctx.fillRect(-BGM, -BGM, W + 2 * BGM, H + 2 * BGM); }
    if (state.fever) {
      ctx.fillStyle = 'rgba(214,170,40,0.10)'; ctx.fillRect(-BGM, -BGM, W + 2 * BGM, H + 2 * BGM);
      ctx.fillStyle = 'rgba(201,162,39,0.75)'; ctx.beginPath();
      for (i = 0; i < 16; i++) { // 舞い上がる金粉
        var fx = ((i * 0.618 + 0.13) % 1) * W + Math.sin(t * 1.3 + i) * U * 3;
        var fy = H - ((t * (0.07 + (i % 5) * 0.018) + i * 0.37) % 1) * H, d = U * (0.35 + (i % 3) * 0.2) * (0.6 + 0.4 * Math.sin(t * 5 + i));
        ctx.moveTo(fx, fy - d * 1.6); ctx.lineTo(fx + d, fy); ctx.lineTo(fx, fy + d * 1.6); ctx.lineTo(fx - d, fy);
      }
      ctx.fill();
    }
    lastDanger = clamp(num(state.danger, 0), 0, 1); lastT = t;
    if (state.willow) drawWillow(ctx, t, state.willow, !!state.fever);
  };

  // ---------------------------------------------------------------- パーティクル
  var MAX_DROPS = 420, drops = [], nDrops = 0;
  (function () { for (var i = 0; i < MAX_DROPS; i++) drops.push({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, size: 1, life: 0, max: 1, color: C.sumi, streak: false }); })();
  function addDrop(x, y, vx, vy, size, life, color, streak, g, drag) {
    var p;
    if (nDrops < MAX_DROPS) p = drops[nDrops++]; else p = drops[(Math.random() * MAX_DROPS) | 0];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.size = size; p.life = 0; p.max = life; p.color = color; p.streak = !!streak;
    p.g = g; p.drag = drag;
  }
  function pool(n, make) { var a = []; for (var i = 0; i < n; i++) { var o = make(); o.on = false; a.push(o); } return a; }
  function take(list) { // 空きが無ければ一番古いものを再利用
    var best = list[0], i;
    for (i = 0; i < list.length; i++) { if (!list[i].on) { best = list[i]; break; } if (list[i].life / list[i].max > best.life / best.max) best = list[i]; }
    best.on = true; best.life = 0; return best;
  }
  var stains = pool(28, function () { return { x: 0, y: 0, size: 1, rot: 0, sx: 1, cv: null, life: 0, max: 1 }; });
  var halves = pool(32, function () { return { x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, d: 1, cv: null, sx: 0, life: 0, max: 1 }; });
  var slashes = pool(16, function () { return { x1: 0, y1: 0, x2: 0, y2: 0, w: 1, color: C.sumi, life: 0, max: 1 }; });
  var kanas = pool(12, function () { return { x: 0, y: 0, ch: '', size: 1, fill: C.sumi, stroke: C.washi, rot: 0, step: 0, life: 0, max: 1 }; });
  var rings = pool(12, function () { return { x: 0, y: 0, r: 1, color: C.sumi, w: 1, seed: 0, life: 0, max: 1 }; });
  var pops = pool(24, function () { return { x: 0, y: 0, text: '', size: 1, color: C.sumi, life: 0, max: 1 }; });
  var leafs = pool(64, function () { return { x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, size: 1, ph: 0, light: false, life: 0, max: 1 }; });
  var bells = pool(3, function () { return { x: 0, y: 0, r: 1, seed: 0, life: 0, max: 0.6 }; });
  var SEAL_PTS = 48;
  var seals = pool(4, function () { return { xs: new Float32Array(SEAL_PTS), ys: new Float32Array(SEAL_PTS), n: 0, cx: 0, cy: 0, rad: 1, count: 1, life: 0, max: 1 }; });
  var HS = 160, halfCanvases = [], halfIdx = 0, HALF_CANVASES = 16;

  var shakeAmt = 0, shakeDur = 0, shakeT = 0, shx = 0, shy = 0;
  var flashColor = '#fff', flashAlpha = 0, flashDur = 0, flashT = 0;

  FX.splat = function (x, y, o) {
    o = o || {}; x = num(x, 0); y = num(y, 0);
    var size = o.size > 0 ? o.size : U * 9, color = o.color || C.sumi, dir = isFinite(o.angle) && o.angle !== null && o.angle !== undefined;
    var ang = dir ? +o.angle : rnd(0, TAU), i;
    var s = take(stains);
    s.x = x; s.y = y; s.size = size * 1.25; s.rot = dir ? ang : rnd(0, TAU); s.sx = dir ? 1.45 : 1;
    s.cv = splatSprite(color, (Math.random() * SPLAT_VAR) | 0); s.max = 6.5;
    var n = clamp(Math.round(7 + size / Math.max(U, 0.5) * 0.45), 6, 18);
    for (i = 0; i < n; i++) {
      var a = dir ? ang + (Math.random() - 0.5) * (Math.random() < 0.75 ? 1.1 : 5) : rnd(0, TAU);
      var sp = size * rnd(2.2, 8.5);
      addDrop(x, y, Math.cos(a) * sp, Math.sin(a) * sp, size * rnd(0.035, 0.13), rnd(0.28, 0.6), color, Math.random() < 0.45, size * 4, 3.2);
    }
  };

  FX.burst = function (x, y, o) {
    o = o || {}; x = num(x, 0); y = num(y, 0);
    var n = clamp(num(o.count, 12) | 0, 0, 120), color = o.color || C.sumi, sp = o.speed > 0 ? o.speed : U * 42;
    var size = o.size > 0 ? o.size : U * 0.8, aim = isFinite(o.angle) && o.angle !== null && o.angle !== undefined;
    var spread = o.spread > 0 ? o.spread : (aim ? 0.7 : TAU);
    for (var i = 0; i < n; i++) {
      var a = aim ? +o.angle + (Math.random() - 0.5) * spread : rnd(0, TAU), v = sp * rnd(0.35, 1.15);
      addDrop(x, y, Math.cos(a) * v, Math.sin(a) * v, size * rnd(0.5, 1.2), rnd(0.35, 0.75), color, Math.random() < 0.55, sp * 0.6, 2.6);
    }
  };

  FX.slashMark = function (x1, y1, x2, y2, o) {
    o = o || {};
    var s = take(slashes);
    s.x1 = num(x1, 0); s.y1 = num(y1, 0); s.x2 = num(x2, 0); s.y2 = num(y2, 0);
    s.w = o.width > 0 ? o.width : U * 1.6; s.color = o.color || C.sumi; s.max = 0.3;
  };

  var STEP_COL = [C.sumi, '#6a1d12', C.shu, '#dd7a1a', C.gold];
  FX.kana = function (x, y, ch, o) {
    o = o || {}; x = num(x, 0); y = num(y, 0);
    var step = clamp(num(o.step, 0) | 0, 0, 4), size = (o.size > 0 ? o.size : U * 9) * (1 + step * 0.14);
    var fill = o.color || STEP_COL[step];
    var k = take(kanas);
    k.x = x; k.y = y; k.ch = String(ch == null ? '' : ch); k.size = size; k.fill = fill; k.step = step;
    k.stroke = step >= 3 ? C.sumi : '#fbf6e8'; k.rot = rnd(-0.2, 0.2); k.max = 0.85 + step * 0.06;
    FX.burst(x, y, { count: 5 + step * 3, color: fill, speed: size * (3.2 + step * 0.5), size: size * 0.07 });
    if (step >= 2) FX.ring(x, y, { radius: size * (0.9 + step * 0.22), color: fill, width: size * 0.07, duration: 0.38 });
    if (step >= 4) FX.burst(x, y, { count: 14, color: '#f0d470', speed: size * 5.5, size: size * 0.05 });
  };

  FX.ring = function (x, y, o) {
    o = o || {};
    var r = take(rings);
    r.x = num(x, 0); r.y = num(y, 0); r.r = o.radius > 0 ? o.radius : U * 20; r.color = o.color || C.sumi;
    r.w = o.width > 0 ? o.width : Math.max(2, r.r * 0.06); r.max = o.duration > 0 ? o.duration : 0.5; r.seed = Math.random() * 100;
  };

  // 鈴: クリック点に金の鈴、半径 radius から中心へすぼまる金の輪（寄せる技）。0.6 秒
  FX.bell = function (x, y, radius) {
    var b = take(bells);
    b.x = num(x, 0); b.y = num(y, 0); b.r = radius > 0 ? radius : U * 30; b.seed = Math.random() * 100; b.max = 0.6;
    FX.burst(b.x, b.y, { count: 8, color: '#f0d470', speed: U * 22, size: U * 0.6 });
  };

  // 鈴の絵。size: 鈴の半径。o: { swing: 紐の付け根を軸にした傾き(rad), gray: 使えない色, alpha }
  FX.drawBell = function (ctx, x, y, size, o) {
    if (!ctx) return;
    o = o || {};
    var s = size > 0 ? size : U * 2.5, gray = !!o.gray;
    var body = gray ? '#a9a398' : C.gold, hi = gray ? '#cfc9bd' : '#f0d470', knot = gray ? '#8f8a80' : C.shu;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y - s * 1.0); ctx.rotate(num(o.swing, 0));
    ctx.translate(0, s * 1.0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var lw = Math.max(1.2, s * 0.14);
    // 朱の紐の結び（上）
    ctx.strokeStyle = knot; ctx.lineWidth = Math.max(1.2, s * 0.2);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, -s * 1.3); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 1.5, s * 0.3, s * 0.2, -0.5, 0, TAU); ctx.ellipse(s * 0.3, -s * 1.5, s * 0.3, s * 0.2, 0.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = knot; ctx.beginPath(); ctx.arc(0, -s * 1.3, s * 0.2, 0, TAU); ctx.fill();
    // 丸い鈴
    ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU);
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = C.sumi; ctx.lineWidth = lw; ctx.stroke();
    // ハイライト
    ctx.strokeStyle = hi; ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.beginPath(); ctx.arc(0, 0, s * 0.68, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    // 横一文字の割れ目と下の小穴
    ctx.strokeStyle = C.sumi; ctx.lineWidth = Math.max(1, s * 0.13);
    ctx.beginPath(); ctx.moveTo(-s * 0.92, s * 0.18); ctx.lineTo(s * 0.92, s * 0.18); ctx.stroke();
    ctx.fillStyle = C.sumi; ctx.beginPath(); ctx.arc(0, s * 0.56, Math.max(1, s * 0.15), 0, TAU); ctx.fill();
    ctx.restore();
  };

  // 盾に弾かれた火花
  FX.spark = function (x, y, angle) {
    x = num(x, 0); y = num(y, 0);
    var back = isFinite(angle) && angle !== null && angle !== undefined ? +angle + Math.PI : null;
    FX.burst(x, y, { count: 9, color: '#f0d470', speed: U * 60, size: U * 0.7, angle: back, spread: 2.2 });
    FX.burst(x, y, { count: 5, color: '#ffffff', speed: U * 40, size: U * 0.55, angle: back, spread: 2.8 });
    FX.ring(x, y, { radius: U * 6, color: C.gold, width: U * 0.7, duration: 0.25 });
    var a = (back === null ? 0 : back) + Math.PI / 2, l = U * 4;
    FX.slashMark(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, { width: U * 1.2, color: '#f0d470' });
  };

  // 円封: 囲んだ輪がすぼまり、「封」の印が押される
  FX.sealLoop = function (pts, o) {
    if (!pts || !(pts.length >= 3)) return;
    o = o || {};
    var s = take(seals), n = pts.length, step = Math.max(1, Math.ceil(n / SEAL_PTS)), i, m = 0, cx = 0, cy = 0, rad = 0;
    for (i = 0; i < n && m < SEAL_PTS; i += step) { s.xs[m] = num(pts[i].x, 0); s.ys[m] = num(pts[i].y, 0); cx += s.xs[m]; cy += s.ys[m]; m++; }
    cx /= m; cy /= m;
    for (i = 0; i < m; i++) rad += Math.sqrt((s.xs[i] - cx) * (s.xs[i] - cx) + (s.ys[i] - cy) * (s.ys[i] - cy));
    s.n = m; s.cx = cx; s.cy = cy; s.rad = rad / m; s.count = Math.max(1, num(o.count, 1) | 0); s.max = 0.75;
    FX.burst(cx, cy, { count: 10 + s.count * 3, color: C.ai, speed: s.rad * 3.2, size: U * 0.8 });
    FX.ring(cx, cy, { radius: s.rad * 1.35, color: C.ai, width: U * 1.1, duration: 0.45 });
  };

  FX.shake = function (amount, duration) {
    amount = num(amount, 0); duration = duration > 0 ? duration : 0.2;
    var cur = shakeDur > 0 ? shakeAmt * (1 - shakeT / shakeDur) : 0;
    if (amount >= cur) { shakeAmt = Math.min(amount, 60); shakeDur = duration; shakeT = 0; }
  };
  FX.applyShake = function (ctx) { if (ctx && (shx || shy)) ctx.translate(shx, shy); };

  FX.flash = function (color, alpha, duration) {
    flashColor = color || '#ffffff'; flashAlpha = clamp(num(alpha, 0.6), 0, 1); flashDur = duration > 0 ? duration : 0.15; flashT = 0;
  };

  // 被弾: 朱の縁取り（ビネット）と柳の上の文字。amount: 縁取りの濃さ 0..1、o: {time,x,y,size,text,sub}
  var hurtAmt = 0, hurtDur = 0.9, hurtT = 0, hurtTxt = null;
  FX.hurt = function (amount, o) {
    o = o || {};
    hurtAmt = clamp(num(amount, 0.8), 0, 1); hurtDur = o.time > 0 ? o.time : 0.9; hurtT = 0;
    hurtTxt = o.text ? { text: String(o.text), sub: o.sub ? String(o.sub) : '', x: num(o.x, W / 2), y: num(o.y, H * 0.5), size: o.size > 0 ? o.size : U * 8.5 } : null;
    // 他の控えめな題字は引っ込めて、被弾の表示を優先する
    if (mainBanner && (mainBanner.style === 'ichiSmall' || mainBanner.style === 'wave') && mainBanner.dur - mainBanner.t > 0.2) mainBanner.t = mainBanner.dur - 0.2;
    if (queuedBanner && (queuedBanner.style === 'ichiSmall' || queuedBanner.style === 'wave')) queuedBanner = null;
  };

  FX.popText = function (x, y, text, o) {
    o = o || {};
    var p = take(pops);
    p.x = num(x, 0); p.y = num(y, 0); p.text = String(text == null ? '' : text);
    p.size = o.size > 0 ? o.size : U * 3.4; p.color = o.color || C.sumi; p.max = 0.85;
  };

  FX.leaves = function (x, y, n) {
    x = num(x, 0); y = num(y, 0); n = clamp(num(n, 8) | 0, 0, 40);
    for (var i = 0; i < n; i++) {
      var l = take(leafs), a = rnd(0, TAU), sp = U * rnd(8, 34);
      l.x = x + rnd(-1, 1) * U * 5; l.y = y + rnd(-1, 1) * U * 6; l.vx = Math.cos(a) * sp; l.vy = Math.sin(a) * sp - U * 12;
      l.rot = rnd(0, TAU); l.vr = rnd(-6, 6); l.size = U * rnd(1.3, 2.4); l.ph = rnd(0, TAU); l.light = Math.random() < 0.4; l.max = rnd(1.1, 1.9);
    }
  };

  FX.sliceEnemy = function (e, angle) {
    if (!e || typeof document === 'undefined') return;
    var r = num(e.r, 0); if (!(r > 0)) r = U * 5;
    angle = num(angle, rnd(0, TAU));
    var S = HS, i, h;
    var cv = halfCanvases[halfIdx];
    if (!cv) cv = halfCanvases[halfIdx] = makeCanvas(S * 2, S);
    halfIdx = (halfIdx + 1) % HALF_CANVASES;
    for (i = 0; i < halves.length; i++) if (halves[i].cv === cv) halves[i].on = false;
    var g = cv.getContext('2d'), k = (S * 0.5) / (r * 1.42), c = {}, key;
    for (key in e) c[key] = e[key];
    c.x = 0; c.y = 0; c.flash = 0; c.r = r;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, S * 2, S);
    for (h = 0; h < 2; h++) {
      g.save();
      g.beginPath(); g.rect(h * S, 0, S, S); g.clip();
      g.translate(h * S + S / 2, S / 2); g.rotate(angle);
      g.beginPath(); if (h === 0) g.rect(-S, -S, S * 2, S - 1); else g.rect(-S, 1, S * 2, S); g.clip();
      g.rotate(-angle); g.scale(k, k);
      try { FX.drawEnemy(g, c); } catch (err) { /* 描けなくても続行 */ }
      g.setTransform(1, 0, 0, 1, h * S + S / 2, S / 2); g.rotate(angle);
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.9; g.fillStyle = '#fff6e2';
      g.fillRect(-S, h === 0 ? -4.5 : 1, S * 2, 3.5);
      g.restore();
    }
    var nx = -Math.sin(angle), ny = Math.cos(angle), ax = Math.cos(angle), ay = Math.sin(angle);
    var ex = num(e.x, 0), ey = num(e.y, 0), evx = num(e.vx, 0) * 0.25, evy = num(e.vy, 0) * 0.25;
    var sp = r * rnd(4.2, 5.6) + U * 10, along = r * rnd(1.5, 3.5);
    for (h = 0; h < 2; h++) {
      var p = take(halves), sg = h === 0 ? -1 : 1;
      p.cv = cv; p.sx = h * S; p.d = S / k; p.x = ex; p.y = ey;
      p.vx = nx * sp * sg + ax * along + evx; p.vy = ny * sp * sg + ay * along + evy - r * 1.5;
      p.rot = 0; p.vr = sg * rnd(2.5, 6.5); p.max = 0.62;
    }
    for (i = 0; i < 7; i++) { // 切り口から散る墨
      var f = rnd(-0.8, 0.8), sg2 = Math.random() < 0.5 ? -1 : 1, v = r * rnd(2, 7);
      addDrop(ex + ax * r * f, ey + ay * r * f, nx * v * sg2 + ax * v * 0.6, ny * v * sg2 + ay * v * 0.6, r * rnd(0.05, 0.13), rnd(0.25, 0.5), C.sumi, Math.random() < 0.5, r * 6, 3);
    }
  };

  FX.reset = function () {
    var lists = [stains, halves, slashes, kanas, rings, pops, leafs, seals, bells], i, j;
    for (i = 0; i < lists.length; i++) for (j = 0; j < lists[i].length; j++) lists[i][j].on = false;
    nDrops = 0; shakeAmt = shakeDur = shakeT = shx = shy = 0; flashAlpha = 0; flashT = 0; hurtAmt = 0; hurtTxt = null;
    mainBanner = null; minorBanner = null; queuedBanner = null; lastDanger = 0;
  };

  FX.resize = function (w, h) {
    w = num(w, 0); h = num(h, 0);
    if (!(w > 0 && h > 0) || typeof document === 'undefined') return;
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (ready && w === W && h === H && dpr === DPR) return;
    W = w; H = h; U = Math.min(W, H) / 100; DPR = dpr; ready = true;
    bgDirty = true; trunk.size = -1;
  };

  // dt: ゲーム内時間（スロー適用後）。題字・フラッシュ・揺れは実時間で進める（realDt を渡せばそれを使う）
  FX.update = function (dt, realDt) {
    dt = num(dt, 0); dt = dt > 0 ? Math.min(dt, 0.1) : 0;
    var now = nowMs(), rdt;
    if (realDt >= 0 && isFinite(realDt)) rdt = Math.min(+realDt, 0.1);
    else rdt = lastNow ? clamp((now - lastNow) / 1000, 0, 0.05) : 0;
    lastNow = now; clock += rdt;
    var i, p;

    for (i = 0; i < nDrops;) {
      p = drops[i]; p.life += dt;
      if (p.life >= p.max) { drops[i] = drops[--nDrops]; drops[nDrops] = p; continue; }
      var k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; i++;
    }
    for (i = 0; i < stains.length; i++) { p = stains[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < halves.length; i++) {
      p = halves[i]; if (!p.on) continue;
      if ((p.life += dt) >= p.max) { p.on = false; continue; }
      p.vx *= Math.max(0, 1 - 1.6 * dt); p.vy = p.vy * Math.max(0, 1 - 1.6 * dt) + p.d * 5.5 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (i = 0; i < slashes.length; i++) { p = slashes[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < kanas.length; i++) { p = kanas[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < rings.length; i++) { p = rings[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < pops.length; i++) { p = pops[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < seals.length; i++) { p = seals[i]; if (p.on && (p.life += rdt) >= p.max) p.on = false; }
    for (i = 0; i < bells.length; i++) { p = bells[i]; if (p.on && (p.life += dt) >= p.max) p.on = false; }
    for (i = 0; i < leafs.length; i++) {
      p = leafs[i]; if (!p.on) continue;
      if ((p.life += dt) >= p.max) { p.on = false; continue; }
      var kk = Math.max(0, 1 - 2.2 * dt);
      p.vx = p.vx * kk + Math.sin(p.life * 5 + p.ph) * U * 40 * dt; p.vy = p.vy * kk + U * 26 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }

    if (shakeDur > 0) {
      shakeT += rdt;
      if (shakeT >= shakeDur) { shakeDur = 0; shx = shy = 0; }
      else { var a = shakeAmt * (1 - shakeT / shakeDur); shx = (Math.random() * 2 - 1) * a; shy = (Math.random() * 2 - 1) * a; }
    }
    if (flashAlpha > 0) { flashT += rdt; if (flashT >= flashDur) flashAlpha = 0; }
    if (hurtAmt > 0) { hurtT += rdt; if (hurtT >= hurtDur + 0.3) { hurtAmt = 0; hurtTxt = null; } }
    if (mainBanner) {
      mainBanner.t += rdt;
      if (mainBanner.t >= mainBanner.dur) { mainBanner = queuedBanner; queuedBanner = null; }
    } else if (queuedBanner) { mainBanner = queuedBanner; queuedBanner = null; }
    if (minorBanner) { minorBanner.t += rdt; if (minorBanner.t >= minorBanner.dur) minorBanner = null; }
  };

  FX.drawStains = function (ctx) {
    if (!ctx) return;
    for (var i = 0; i < stains.length; i++) {
      var s = stains[i]; if (!s.on || !s.cv) continue;
      var p = s.life / s.max, pop = 0.55 + 0.45 * easeOut(s.life / 0.09), d = s.size * pop;
      ctx.save();
      ctx.globalAlpha = 0.64 * (p < 0.25 ? 1 : 1 - (p - 0.25) / 0.75);
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.drawImage(s.cv, -d * s.sx / 2, -d / 2, d * s.sx, d);
      ctx.restore();
    }
  };

  FX.drawParticles = function (ctx) {
    if (!ctx) return;
    var i, p, q, a;
    ctx.save();
    ctx.lineCap = 'round';

    // 衝撃波の輪（墨のにじみ）
    for (i = 0; i < rings.length; i++) {
      p = rings[i]; if (!p.on) continue;
      q = p.life / p.max; var rr = p.r * easeOut(q); a = Math.pow(1 - q, 1.3);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = a * 0.22; ctx.lineWidth = p.w * 2.6 * (1 - q * 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.9, 0, TAU); ctx.stroke();
      ctx.globalAlpha = a * 0.85; ctx.lineWidth = Math.max(1, p.w * (1 - q * 0.75));
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, p.seed, p.seed + TAU * 0.93); ctx.stroke();
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = Math.max(0.8, p.w * 0.3);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.07, p.seed + 2, p.seed + 2 + TAU * 0.6); ctx.stroke();
      ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.beginPath();
      for (var j = 0; j < 9; j++) {
        var an = p.seed + j * 2.4, dr = rr * (1.02 + 0.09 * Math.sin(j * 5.3 + p.seed)), ds = p.w * (0.25 + 0.3 * Math.abs(Math.sin(j * 3.1))) * (1 - q);
        ctx.moveTo(p.x + Math.cos(an) * dr + ds, p.y + Math.sin(an) * dr);
        ctx.arc(p.x + Math.cos(an) * dr, p.y + Math.sin(an) * dr, ds, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 鈴: 外から中心へすぼまる金の輪と、揺れる金の鈴
    for (i = 0; i < bells.length; i++) {
      p = bells[i]; if (!p.on) continue;
      for (var bk = 0; bk < 3; bk++) {
        q = clamp((p.life - bk * 0.07) / 0.4, 0, 1);
        if (q <= 0) continue;
        var br = p.r * (1 - easeOut(q)) + U * 3, ba = q < 0.15 ? q / 0.15 : (q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1);
        var bw = U * (1.5 - bk * 0.3) * (0.6 + 0.6 * q);
        a = p.seed + bk * 2.1;
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.sumi; ctx.globalAlpha = ba * 0.35; ctx.lineWidth = bw * 1.9;
        ctx.beginPath(); ctx.arc(p.x, p.y, br, a, a + TAU * 0.9); ctx.stroke();
        ctx.strokeStyle = bk === 1 ? '#f0d470' : C.gold; ctx.globalAlpha = ba * 0.95; ctx.lineWidth = bw;
        ctx.beginPath(); ctx.arc(p.x, p.y, br, a, a + TAU * 0.9); ctx.stroke();
        ctx.strokeStyle = '#f0d470'; ctx.globalAlpha = ba * 0.7; ctx.lineWidth = Math.max(0.8, bw * 0.3);
        ctx.beginPath(); ctx.arc(p.x, p.y, br * 1.05, a + 2.2, a + 2.2 + TAU * 0.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var bq = p.life / p.max, pop = p.life < 0.12 ? 0.5 + 1.0 * easeOut(p.life / 0.12) : 1 + 0.5 * Math.exp(-(p.life - 0.12) * 10);
      FX.drawBell(ctx, p.x, p.y, U * 2.5 * pop, { swing: 0.55 * Math.exp(-p.life * 4.5) * Math.sin(p.life * 30), alpha: bq < 0.75 ? 1 : 1 - (bq - 0.75) / 0.25 });
    }
    ctx.globalAlpha = 1;

    // 円封の輪と「封」の印
    for (i = 0; i < seals.length; i++) {
      p = seals[i]; if (!p.on || p.n < 3) continue;
      q = p.life / p.max;
      var sk = 1 - 0.3 * easeIn(Math.min(1, q * 1.6)), sj;
      ctx.beginPath();
      for (sj = 0; sj < p.n; sj++) {
        var sx = p.cx + (p.xs[sj] - p.cx) * sk, sy = p.cy + (p.ys[sj] - p.cy) * sk;
        if (sj === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.3 * (1 - q); ctx.fillStyle = C.ai; ctx.fill();
      ctx.globalAlpha = Math.min(1, (1 - q) * 1.6); ctx.strokeStyle = C.sumi; ctx.lineWidth = U * (2.2 - 1.2 * q); ctx.stroke();
      ctx.globalAlpha = Math.min(1, (1 - q) * 1.6) * 0.8; ctx.strokeStyle = '#fbf6e8'; ctx.lineWidth = U * 0.45; ctx.stroke();
      // 印
      var ss = clamp(p.rad * 0.8, U * 5, U * 11) * (p.life < 0.12 ? lerp(1.9, 1, easeOut(p.life / 0.12)) : 1);
      var sa = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3, spr0 = kanaSprite('封', '#fbf6e8', C.shu);
      ctx.save(); ctx.translate(p.cx, p.cy); ctx.rotate(-0.12);
      ctx.globalAlpha = sa * 0.92; ctx.fillStyle = C.shu;
      ctx.fillRect(-ss * 0.62, -ss * 0.62, ss * 1.24, ss * 1.24);
      ctx.globalAlpha = sa; ctx.strokeStyle = '#fbf6e8'; ctx.lineWidth = Math.max(1, ss * 0.05);
      ctx.strokeRect(-ss * 0.5, -ss * 0.5, ss, ss);
      if (spr0) { var sc0 = ss * 0.82 / KANA_PX; ctx.drawImage(spr0.cv, -spr0.w * sc0 / 2, -spr0.h * sc0 / 2, spr0.w * sc0, spr0.h * sc0); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // 斬られた半身
    for (i = 0; i < halves.length; i++) {
      p = halves[i]; if (!p.on || !p.cv) continue;
      q = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = q < 0.45 ? 1 : 1 - (q - 0.45) / 0.55;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      var d = p.d * (1 - q * 0.15);
      ctx.drawImage(p.cv, p.sx, 0, HS, HS, -d / 2, -d / 2, d, d);
      ctx.restore();
    }

    // 飛沫（色ごとにまとめて塗る）
    var cur = null;
    for (i = 0; i < nDrops; i++) {
      p = drops[i]; q = p.life / p.max;
      var sz = p.size * (1 - q * q);
      if (sz < 0.2) continue;
      if (p.color !== cur) { if (cur !== null) ctx.fill(); cur = p.color; ctx.fillStyle = cur; ctx.beginPath(); }
      if (p.streak) {
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > 1) {
          var ux = p.vx / sp, uy = p.vy / sp, len = Math.min(sp * 0.035, sz * 7) + sz;
          ctx.moveTo(p.x + ux * sz, p.y + uy * sz); ctx.lineTo(p.x - uy * sz * 0.7, p.y + ux * sz * 0.7);
          ctx.lineTo(p.x - ux * len, p.y - uy * len); ctx.lineTo(p.x + uy * sz * 0.7, p.y - ux * sz * 0.7);
          ctx.closePath(); continue;
        }
      }
      ctx.moveTo(p.x + sz, p.y); ctx.arc(p.x, p.y, sz, 0, TAU);
    }
    if (cur !== null) ctx.fill();

    // 柳の葉
    for (i = 0; i < leafs.length; i++) {
      p = leafs[i]; if (!p.on) continue;
      q = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.life * 7 + p.ph)));
      ctx.fillStyle = p.light ? '#8fae58' : C.yanagi;
      ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.quadraticCurveTo(0, -p.size * 0.42, p.size, 0); ctx.quadraticCurveTo(0, p.size * 0.42, -p.size, 0); ctx.fill();
      ctx.restore();
    }

    // 斬撃の閃光
    for (i = 0; i < slashes.length; i++) {
      p = slashes[i]; if (!p.on) continue;
      q = p.life / p.max;
      var g0 = clamp(q / 0.18, 0, 1), ex = 0.18 * (1 - q);
      var x1 = lerp(p.x1, p.x2, -ex), y1 = lerp(p.y1, p.y2, -ex);
      var x2 = lerp(p.x1, p.x2, g0 * (1 + ex)), y2 = lerp(p.y1, p.y2, g0 * (1 + ex));
      var hw = p.w * 0.5 * Math.pow(1 - q, 1.6);
      ctx.globalAlpha = Math.min(1, (1 - q) * 1.4); ctx.fillStyle = p.color; lens(ctx, x1, y1, x2, y2, hw);
      ctx.globalAlpha = clamp(1.15 - q * 2.2, 0, 1); ctx.fillStyle = '#ffffff'; lens(ctx, x1, y1, x2, y2, hw * 0.55);
    }
    ctx.globalAlpha = 1;

    // 筆文字
    for (i = 0; i < kanas.length; i++) {
      p = kanas[i]; if (!p.on) continue;
      var spr = kanaSprite(p.ch, p.fill, p.stroke); if (!spr) continue;
      q = p.life / p.max;
      var sc = p.life < 0.1 ? lerp(0.3, 1.38, easeOut(p.life / 0.1)) : 1 + 0.38 * Math.exp(-(p.life - 0.1) * 13);
      sc *= p.size / KANA_PX;
      ctx.save();
      ctx.globalAlpha = q < 0.62 ? 1 : 1 - (q - 0.62) / 0.38;
      ctx.translate(p.x, p.y - p.size * 0.75 * easeOut(q)); ctx.rotate(p.rot * (1 - q * 0.5));
      if (p.step >= 4 && p.life < 0.22) { // 「ぎ」は後光つき
        ctx.globalAlpha *= 1 - p.life / 0.22; ctx.fillStyle = '#fff3b8';
        ctx.beginPath(); ctx.arc(0, 0, p.size * (0.5 + p.life * 3), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(spr.cv, -spr.w * sc / 2, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
      ctx.restore();
    }

    // 浮き文字
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (i = 0; i < pops.length; i++) {
      p = pops[i]; if (!p.on) continue;
      q = p.life / p.max;
      var ps = p.size * (p.life < 0.08 ? lerp(0.5, 1.25, p.life / 0.08) : 1 + 0.25 * Math.exp(-(p.life - 0.08) * 16));
      ctx.globalAlpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
      ctx.font = Math.max(4, ps).toFixed(1) + 'px ' + FONT_BOLD;
      var py = p.y - p.size * 1.6 * easeOut(q);
      ctx.lineWidth = ps * 0.2; ctx.strokeStyle = '#fbf6e8'; ctx.strokeText(p.text, p.x, py);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, py);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- 妖
  function eye(ctx, x, y, r, lx, ly) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#fbf7ea'; ctx.fill();
    ctx.lineWidth = r * 0.2; ctx.strokeStyle = C.sumi; ctx.stroke();
    var px = x + lx * r * 0.36, py = y + ly * r * 0.36;
    ctx.beginPath(); ctx.arc(px, py, r * 0.52, 0, TAU); ctx.fillStyle = C.sumi; ctx.fill();
    ctx.beginPath(); ctx.arc(px - r * 0.17, py - r * 0.19, r * 0.17, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  }
  function bleed(ctx, path, ga) { // 墨のにじみ
    ctx.save(); ctx.scale(1.12, 1.12); path(); ctx.restore();
    ctx.globalAlpha = ga * 0.13; ctx.fillStyle = C.sumi; ctx.fill(); ctx.globalAlpha = ga;
  }
  function whiten(ctx, path, ga, fl) {
    if (fl <= 0) return;
    path(); ctx.globalAlpha = ga * fl * 0.85; ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = ga;
  }
  function lookDir(e, out) {
    var vx = num(e.vx, 0), vy = num(e.vy, 0), sp = Math.sqrt(vx * vx + vy * vy);
    out.x = sp > 1 ? vx / sp : 0; out.y = sp > 1 ? vy / sp : 0.25; out.sp = sp;
    return out;
  }
  var LK = { x: 0, y: 0, sp: 0 };

  function drawHitodama(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var ta = LK.sp > 1 ? Math.atan2(-LK.y, -LK.x) : -Math.PI / 2;
    var fk = Math.sin(t * 9 + sd), fk2 = Math.sin(t * 13 + sd * 2.1);
    var hx = -Math.cos(ta) * 0.22, hy = -Math.sin(ta) * 0.22, lx = LK.x, ly = LK.y;
    function flame(k) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ta); ctx.scale(k, k);
      var R = 0.62, a0 = 1.15;
      ctx.beginPath(); ctx.arc(0, 0, R, a0, TAU - a0);
      ctx.quadraticCurveTo(0.62, -0.5 + fk * 0.1, 1.2 + fk2 * 0.05, fk * 0.17);
      ctx.quadraticCurveTo(0.66, 0.36 + fk2 * 0.08, R * Math.cos(a0), R * Math.sin(a0));
      ctx.closePath(); ctx.restore();
    }
    flame(1.13); ctx.globalAlpha = ga * 0.13; ctx.fillStyle = C.sumi; ctx.fill();
    flame(1); ctx.globalAlpha = ga * 0.93; ctx.fill();
    flame(0.66); ctx.globalAlpha = ga * 0.9; ctx.fillStyle = '#34466e'; ctx.fill();
    flame(0.36); ctx.globalAlpha = ga * 0.35; ctx.fillStyle = '#c9d6ee'; ctx.fill();
    ctx.globalAlpha = ga * 0.8; ctx.fillStyle = C.sumi; // 千切れた火
    var w1 = (t * 1.4 + sd) % 1, w2 = (t * 1.4 + sd + 0.5) % 1;
    ctx.beginPath(); ctx.arc(Math.cos(ta) * (0.98 + w1 * 0.22) + fk * 0.05, Math.sin(ta) * (0.98 + w1 * 0.22), 0.085 * (1 - w1), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(Math.cos(ta) * (0.94 + w2 * 0.22) - fk2 * 0.07, Math.sin(ta) * (0.94 + w2 * 0.22), 0.06 * (1 - w2), 0, TAU); ctx.fill();
    ctx.globalAlpha = ga;
    eye(ctx, hx - 0.2, hy - 0.06, 0.155, lx, ly); eye(ctx, hx + 0.2, hy - 0.06, 0.155, lx, ly);
    ctx.globalAlpha = ga * 0.6; ctx.fillStyle = C.shu;
    ctx.beginPath(); ctx.arc(hx - 0.37, hy + 0.15, 0.075, 0, TAU); ctx.arc(hx + 0.37, hy + 0.15, 0.075, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga; ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.arc(hx, hy + 0.14, 0.085, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    whiten(ctx, function () { flame(1); }, ga, fl);
  }

  function drawKarasu(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var hd = LK.sp > 1 ? Math.atan2(LK.y, LK.x) : num(e.rot, 0);
    ctx.rotate(hd); if (Math.cos(hd) < 0) ctx.scale(1, -1);
    var flap = Math.sin(t * 15 + sd);
    function wing(tipY, back) {
      ctx.beginPath(); ctx.moveTo(0.3, -0.06);
      ctx.quadraticCurveTo(0.14, tipY * 0.95, -0.4 + back, tipY);
      ctx.lineTo(-0.28 + back, tipY * 0.74); ctx.lineTo(-0.58 + back, tipY * 0.66);
      ctx.lineTo(-0.4 + back, tipY * 0.44); ctx.lineTo(-0.68 + back, tipY * 0.3);
      ctx.lineTo(-0.36, 0.02); ctx.closePath();
    }
    function body() {
      ctx.beginPath();
      ctx.moveTo(-0.38, -0.15); ctx.lineTo(-1.0, -0.2); ctx.lineTo(-0.82, -0.05); ctx.lineTo(-1.0, 0.1);
      ctx.lineTo(-0.8, 0.13); ctx.lineTo(-0.92, 0.3); ctx.lineTo(-0.33, 0.2); ctx.closePath();
      ctx.moveTo(0.56, 0.02); ctx.ellipse(0, 0.02, 0.56, 0.32, 0, 0, TAU);
      ctx.moveTo(0.75, -0.14); ctx.arc(0.48, -0.14, 0.27, 0, TAU);
    }
    wing(-(0.25 + 0.7 * (0.5 - 0.5 * flap)), 0.1); ctx.globalAlpha = ga * 0.5; ctx.fillStyle = C.sumi; ctx.fill(); ctx.globalAlpha = ga;
    bleed(ctx, body, ga);
    body(); ctx.globalAlpha = ga * 0.95; ctx.fillStyle = C.sumi; ctx.fill(); ctx.globalAlpha = ga;
    // くちばし
    ctx.beginPath(); ctx.moveTo(0.69, -0.26); ctx.quadraticCurveTo(0.9, -0.2, 1.03, -0.04); ctx.lineTo(0.7, 0.0); ctx.closePath();
    ctx.fillStyle = C.gold; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.035; ctx.stroke();
    // 頭襟
    ctx.beginPath(); ctx.moveTo(0.33, -0.36); ctx.lineTo(0.38, -0.52); ctx.lineTo(0.53, -0.52); ctx.lineTo(0.58, -0.37); ctx.closePath();
    ctx.fillStyle = C.shu; ctx.fill(); ctx.stroke();
    eye(ctx, 0.56, -0.17, 0.1, 0.5, 0.1);
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.moveTo(0.42, -0.31); ctx.lineTo(0.68, -0.22); ctx.stroke();
    var tipY = -0.92 * flap; if (Math.abs(tipY) < 0.12) tipY = tipY < 0 ? -0.12 : 0.12;
    wing(tipY, 0); ctx.fillStyle = '#0f0c0a'; ctx.fill();
    ctx.strokeStyle = 'rgba(242,234,216,0.32)'; ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(0.1, tipY * 0.2); ctx.lineTo(-0.3, tipY * 0.66); ctx.moveTo(0.0, tipY * 0.12); ctx.lineTo(-0.42, tipY * 0.4); ctx.stroke();
    whiten(ctx, body, ga, fl);
  }

  function drawChochin(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var lx = LK.x, ly = LK.y;
    ctx.rotate(num(e.rot, 0) + Math.sin(t * 3 + sd) * 0.14);
    var open = 0.5 + 0.5 * Math.sin(t * 4 + sd * 1.3), i;
    function body() { ctx.beginPath(); ctx.ellipse(0, 0, 0.64, 0.68, 0, 0, TAU); }
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.arc(0, -0.76, 0.2, Math.PI, TAU); ctx.stroke();
    bleed(ctx, body, ga);
    body(); ctx.fillStyle = '#ecca86'; ctx.fill();
    ctx.globalAlpha = ga * 0.55; ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.ellipse(-0.08, -0.12, 0.34, 0.4, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga * 0.3; ctx.fillStyle = C.shu; ctx.beginPath(); ctx.ellipse(0, 0.36, 0.5, 0.3, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga * 0.32; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (i = -2; i <= 2; i++) {
      var y = i * 0.235, hw = 0.64 * Math.sqrt(Math.max(0, 1 - (y / 0.68) * (y / 0.68)));
      ctx.moveTo(-hw, y); ctx.quadraticCurveTo(0, y + 0.07, hw, y);
    }
    ctx.stroke();
    ctx.globalAlpha = ga; body(); ctx.lineWidth = 0.06; ctx.stroke();
    ctx.fillStyle = C.sumi; ctx.fillRect(-0.3, -0.75, 0.6, 0.13); ctx.fillRect(-0.26, 0.61, 0.52, 0.12);
    // 口と舌
    var my = 0.13;
    ctx.beginPath(); ctx.moveTo(-0.47, my); ctx.quadraticCurveTo(0, my + 0.1, 0.47, my);
    ctx.quadraticCurveTo(0, my + 0.34 + 0.22 * open, -0.47, my); ctx.fillStyle = '#2a0f0c'; ctx.fill();
    var wag = Math.sin(t * 6 + sd) * 0.12;
    ctx.fillStyle = C.shu; quadRibbon(ctx, 0.04, my + 0.2, 0.18 + wag, 0.62, 0.05 + wag * 1.6, 0.96, 0.12, 0.075, 8);
    ctx.beginPath(); ctx.arc(0.05 + wag * 1.6, 0.96, 0.075, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,10,0.6)'; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(0.05, my + 0.26); ctx.quadraticCurveTo(0.17 + wag, 0.62, 0.06 + wag * 1.5, 0.9); ctx.stroke();
    eye(ctx, -0.25, -0.25, 0.18, lx, ly); eye(ctx, 0.25, -0.27, 0.135, lx, ly);
    whiten(ctx, body, ga, fl);
  }

  function drawDaruma(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var lx = LK.x, ly = LK.y, i, j;
    ctx.translate(0, 0.9); ctx.rotate(num(e.rot, 0) + Math.sin(t * 5 + sd) * 0.1); ctx.translate(0, -0.9);
    function body() { ctx.beginPath(); ctx.ellipse(0, 0.04, 0.9, 0.92, 0, 0, TAU); }
    bleed(ctx, body, ga);
    body(); ctx.fillStyle = C.shu; ctx.fill();
    ctx.globalAlpha = ga * 0.2; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.arc(0, 0.04, 0.76, 0.15, 1.7); ctx.stroke();
    ctx.globalAlpha = ga; body(); ctx.lineWidth = 0.07; ctx.stroke();
    // 腹の金模様
    ctx.strokeStyle = C.gold; ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (i = 0; i < 3; i++) ctx.moveTo(Math.cos(Math.PI * 1.18) * (0.13 + i * 0.1), 0.62 + Math.sin(Math.PI * 1.18) * (0.13 + i * 0.1)), ctx.arc(0, 0.62, 0.13 + i * 0.1, Math.PI * 1.18, Math.PI * 1.82);
    ctx.moveTo(-0.66, 0.2); ctx.quadraticCurveTo(-0.62, 0.56, -0.4, 0.78);
    ctx.moveTo(0.66, 0.2); ctx.quadraticCurveTo(0.62, 0.56, 0.4, 0.78);
    ctx.stroke();
    // 顔
    ctx.beginPath(); ctx.ellipse(0, -0.2, 0.6, 0.45, 0, 0, TAU); ctx.fillStyle = '#f6eeda'; ctx.fill();
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.045; ctx.stroke();
    ctx.lineWidth = 0.095;
    ctx.beginPath(); ctx.moveTo(-0.5, -0.4); ctx.quadraticCurveTo(-0.3, -0.62, -0.07, -0.42);
    ctx.moveTo(0.5, -0.4); ctx.quadraticCurveTo(0.3, -0.62, 0.07, -0.42); ctx.stroke();
    eye(ctx, -0.25, -0.2, 0.16, lx, ly);
    ctx.beginPath(); ctx.arc(0.25, -0.2, 0.16, 0, TAU); ctx.fillStyle = '#fbf7ea'; ctx.fill(); ctx.lineWidth = 0.035; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.25 + lx * 0.04, -0.2 + ly * 0.04, 0.03, 0, TAU); ctx.fillStyle = C.sumi; ctx.fill();
    ctx.lineWidth = 0.055;
    ctx.beginPath(); ctx.moveTo(-0.04, 0.03); ctx.quadraticCurveTo(-0.24, 0.17, -0.44, 0.0);
    ctx.moveTo(0.04, 0.03); ctx.quadraticCurveTo(0.24, 0.17, 0.44, 0.0); ctx.stroke();
    ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.07, 0.13); ctx.lineTo(0.07, 0.13); ctx.stroke();
    ctx.globalAlpha = ga * 0.45; ctx.fillStyle = C.shu;
    ctx.beginPath(); ctx.arc(-0.43, -0.07, 0.065, 0, TAU); ctx.arc(0.43, -0.07, 0.065, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
    // ひび
    var mh = num(e.maxHp, 0), dmg = mh > 0 ? clamp(1 - num(e.hp, mh) / mh, 0, 1) : 0, nc = Math.min(5, Math.ceil(dmg * 5 - 0.001));
    if (nc > 0) {
      var R = mulberry(((num(e.seed, 0) * 9973) | 0) + 13);
      for (var pass = 0; pass < 2; pass++) {
        R = mulberry(((num(e.seed, 0) * 9973) | 0) + 13);
        ctx.strokeStyle = pass === 0 ? C.sumi : '#fff3dc'; ctx.lineWidth = pass === 0 ? 0.06 : 0.018;
        ctx.beginPath();
        for (i = 0; i < nc; i++) {
          var a = R() * TAU, x = Math.cos(a) * 0.86, y = 0.04 + Math.sin(a) * 0.88, kx = -Math.cos(a), ky = -Math.sin(a);
          ctx.moveTo(x, y);
          for (j = 0; j < 4; j++) {
            var stp = 0.12 + R() * 0.12, jit = (R() - 0.5) * 0.3;
            x += kx * stp - ky * jit; y += ky * stp + kx * jit; ctx.lineTo(x, y);
            if (j === 1) { ctx.lineTo(x - ky * 0.14, y + kx * 0.14); ctx.moveTo(x, y); }
          }
        }
        ctx.stroke();
      }
    }
    whiten(ctx, body, ga, fl);
  }

  function drawKasa(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var lx = LK.x, ly = LK.y;
    ctx.rotate(num(e.rot, 0));
    var hop = Math.sin(t * 8 + sd), sq = 1 + hop * 0.07, kick = hop * 0.1;
    ctx.translate(0, 1); ctx.scale(2 - sq, sq); ctx.translate(0, -1);
    // 一本足と下駄
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.21;
    ctx.beginPath(); ctx.moveTo(0, 0.25); ctx.quadraticCurveTo(0.07 + kick, 0.55, 0.02 + kick * 1.4, 0.82); ctx.stroke();
    ctx.strokeStyle = '#eddcb9'; ctx.lineWidth = 0.125;
    ctx.beginPath(); ctx.moveTo(0, 0.25); ctx.quadraticCurveTo(0.07 + kick, 0.55, 0.02 + kick * 1.4, 0.82); ctx.stroke();
    var gx = 0.04 + kick * 1.4;
    ctx.fillStyle = C.sumi; ctx.fillRect(gx - 0.27, 0.84, 0.54, 0.075); ctx.fillRect(gx - 0.18, 0.9, 0.08, 0.1); ctx.fillRect(gx + 0.1, 0.9, 0.08, 0.1);
    ctx.strokeStyle = C.shu; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(gx - 0.12, 0.84); ctx.lineTo(gx, 0.76); ctx.lineTo(gx + 0.12, 0.84); ctx.stroke();
    function canopy() {
      ctx.beginPath(); ctx.moveTo(0, -1.0);
      ctx.quadraticCurveTo(0.44, -0.5, 0.67, 0.25); ctx.quadraticCurveTo(0.5, 0.4, 0.33, 0.27);
      ctx.quadraticCurveTo(0.17, 0.42, 0, 0.29); ctx.quadraticCurveTo(-0.17, 0.42, -0.33, 0.27);
      ctx.quadraticCurveTo(-0.5, 0.4, -0.67, 0.25); ctx.quadraticCurveTo(-0.44, -0.5, 0, -1.0); ctx.closePath();
    }
    bleed(ctx, canopy, ga);
    canopy(); ctx.fillStyle = '#2a3552'; ctx.fill();
    ctx.globalAlpha = ga * 0.3; ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(0, -0.97); ctx.quadraticCurveTo(0.24, -0.4, 0.33, 0.27);
    ctx.moveTo(0, -0.97); ctx.quadraticCurveTo(-0.24, -0.4, -0.33, 0.27);
    ctx.moveTo(0, -0.97); ctx.lineTo(0, -0.5);
    ctx.stroke();
    ctx.globalAlpha = ga;
    // 継ぎ当て
    ctx.save(); ctx.translate(-0.36, 0.02); ctx.rotate(0.3);
    ctx.fillStyle = C.shu; ctx.fillRect(-0.08, -0.08, 0.16, 0.16);
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.05, -0.05); ctx.lineTo(0.05, 0.05); ctx.moveTo(0.05, -0.05); ctx.lineTo(-0.05, 0.05); ctx.stroke();
    ctx.restore();
    canopy(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.06; ctx.stroke();
    eye(ctx, 0.02, -0.2, 0.25, lx, ly);
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.moveTo(-0.2, 0.1); ctx.quadraticCurveTo(0, 0.2, 0.22, 0.08); ctx.stroke();
    var wag = Math.sin(t * 7 + sd) * 0.08;
    ctx.fillStyle = C.shu; quadRibbon(ctx, 0.08, 0.14, 0.16 + wag, 0.3, 0.2 + wag * 1.5, 0.46, 0.075, 0.05, 6);
    ctx.beginPath(); ctx.arc(0.2 + wag * 1.5, 0.46, 0.05, 0, TAU); ctx.fill();
    whiten(ctx, canopy, ga, fl);
  }

  function drawBoss(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var lx = LK.x, ly = LK.y, i;
    ctx.rotate(num(e.rot, 0));
    var br = 1 + Math.sin(t * 1.6 + sd) * 0.02; ctx.scale(br, 2 - br);
    var mh = num(e.maxHp, 0), dmg = mh > 0 ? clamp(1 - num(e.hp, mh) / mh, 0, 1) : 0, rage = dmg >= 0.5;
    ctx.fillStyle = C.sumi; ctx.globalAlpha = ga * 0.24; // 墨の煙
    for (i = 0; i < 9; i++) {
      var a = i / 9 * TAU + t * 0.25;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 0.82, 0.32 + Math.sin(a) * 0.52, 0.19 + 0.05 * Math.sin(t * 2 + i * 1.7), 0, TAU); ctx.fill();
    }
    var rush = clamp(num(e.rush, 0), 0, 1);
    if (rush > 0) { // 突進の予兆: 朱の気
      ctx.fillStyle = C.shu; ctx.globalAlpha = ga * 0.32 * rush * (0.7 + 0.3 * Math.sin(t * 18));
      ctx.beginPath(); ctx.arc(0, 0.1, 1.12 + 0.12 * rush, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = ga;
    var wv = Math.sin(t * 2.2 + sd) * 0.03;
    function body() {
      ctx.beginPath(); ctx.moveTo(-0.95, 0.9);
      ctx.quadraticCurveTo(-1.0, 0.2, -0.577, 0.12);
      ctx.arc(0, -0.24, 0.68, 2.583, 6.841);
      ctx.quadraticCurveTo(1.0, 0.2, 0.95, 0.9);
      ctx.quadraticCurveTo(0.72, 1.0 + wv, 0.48, 0.9); ctx.quadraticCurveTo(0.24, 1.0 - wv, 0, 0.9);
      ctx.quadraticCurveTo(-0.24, 1.0 + wv, -0.48, 0.9); ctx.quadraticCurveTo(-0.72, 1.0 - wv, -0.95, 0.9);
      ctx.closePath();
    }
    // 福耳
    ctx.fillStyle = '#1d1915';
    ctx.beginPath(); ctx.ellipse(-0.7, -0.14, 0.1, 0.21, 0.15, 0, TAU); ctx.ellipse(0.7, -0.14, 0.1, 0.21, -0.15, 0, TAU); ctx.fill();
    bleed(ctx, body, ga);
    body(); ctx.globalAlpha = ga * 0.96; ctx.fillStyle = '#1d1915'; ctx.fill();
    ctx.globalAlpha = ga * 0.09; ctx.fillStyle = '#f2ead8';
    ctx.beginPath(); ctx.ellipse(-0.18, -0.6, 0.36, 0.2, -0.3, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga * 0.35; ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.arc(-0.7, -0.12, 0.05, 1.2, 4.4); ctx.moveTo(0.72, -0.07); ctx.arc(0.7, -0.12, 0.05, -1.2, 1.9); ctx.stroke();
    ctx.globalAlpha = ga;
    // 数珠
    for (i = 0; i < 11; i++) {
      var bx = -0.75 + i * 0.15, by = 0.34 + 0.3 * (1 - (bx / 0.75) * (bx / 0.75)), mid = i === 5;
      ctx.beginPath(); ctx.arc(bx, by, mid ? 0.1 : 0.075, 0, TAU);
      ctx.fillStyle = mid ? C.gold : C.shu; ctx.fill();
      ctx.lineWidth = 0.022; ctx.strokeStyle = '#0d0a08'; ctx.stroke();
    }
    // 目
    for (i = -1; i <= 1; i += 2) {
      ctx.save(); ctx.translate(i * 0.28, -0.3); ctx.rotate(i * -0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.21, 0.135, 0, 0, TAU); ctx.fillStyle = '#f6eeda'; ctx.fill();
      ctx.beginPath(); ctx.arc(lx * 0.08, ly * 0.03 + 0.01, 0.105, 0, TAU); ctx.fillStyle = rage ? C.shu : C.gold; ctx.fill();
      ctx.beginPath(); ctx.ellipse(lx * 0.09, ly * 0.035 + 0.01, 0.028, 0.09, 0, 0, TAU); ctx.fillStyle = '#0d0a08'; ctx.fill();
      ctx.beginPath(); ctx.arc(lx * 0.08 - 0.04, ly * 0.03 - 0.03, 0.022, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#1d1915'; ctx.lineWidth = 0.11; // 重いまぶた
      ctx.beginPath(); ctx.moveTo(i * 0.53, -0.47); ctx.lineTo(i * 0.05, -0.34); ctx.stroke();
    }
    // 第三の目
    if (rage) {
      ctx.beginPath(); ctx.ellipse(0, -0.64, 0.11, 0.075, 0, 0, TAU); ctx.fillStyle = '#f6eeda'; ctx.fill();
      ctx.beginPath(); ctx.arc(lx * 0.03, -0.64, 0.055, 0, TAU); ctx.fillStyle = C.shu; ctx.fill();
      ctx.beginPath(); ctx.arc(lx * 0.03, -0.64, 0.022, 0, TAU); ctx.fillStyle = '#0d0a08'; ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(242,234,216,0.5)'; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(-0.1, -0.64); ctx.quadraticCurveTo(0, -0.59, 0.1, -0.64); ctx.stroke();
    }
    // 口と牙
    var mo = 0.05 * Math.sin(t * 2.3 + sd);
    ctx.beginPath(); ctx.moveTo(-0.37, -0.02); ctx.quadraticCurveTo(0, 0.1, 0.37, -0.02);
    ctx.quadraticCurveTo(0, 0.36 + mo, -0.37, -0.02); ctx.fillStyle = '#8f1f12'; ctx.fill();
    ctx.fillStyle = '#f6eeda'; ctx.beginPath();
    ctx.moveTo(-0.23, 0.025); ctx.lineTo(-0.12, 0.045); ctx.lineTo(-0.17, 0.17); ctx.closePath();
    ctx.moveTo(0.23, 0.025); ctx.lineTo(0.12, 0.045); ctx.lineTo(0.17, 0.17); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = ga * 0.38; ctx.fillStyle = C.shu;
    ctx.beginPath(); ctx.arc(-0.47, -0.08, 0.09, 0, TAU); ctx.arc(0.47, -0.08, 0.09, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga;
    whiten(ctx, body, ga, fl);
  }

  // 分身妖: くっついた二つ玉（真ん中に切り取り線）。斬ると一つ目の小玉に割れる
  function drawBunshinMini(ctx, e, t, sd, ga, fl, lx, ly) {
    var odd = ((num(e.seed, 0) * 1000) | 0) % 2 === 1, wob = Math.sin(t * 10 + sd) * 0.05;
    function body() {
      ctx.beginPath(); ctx.arc(0, 0.12, 0.78, -Math.PI / 2 + 0.45, -Math.PI / 2 - 0.45 + TAU);
      ctx.quadraticCurveTo(-0.16, -0.78, 0.12 + wob * 3, -1.02); ctx.closePath();
    }
    bleed(ctx, body, ga);
    body(); ctx.fillStyle = odd ? '#7fb09a' : '#3f7a70'; ctx.fill();
    ctx.globalAlpha = ga * 0.3; ctx.fillStyle = '#f2ead8';
    ctx.beginPath(); ctx.ellipse(-0.26, -0.2, 0.26, 0.17, -0.5, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga; body(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.08; ctx.stroke();
    eye(ctx, 0.02, 0.06, 0.3, lx, ly);
    ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.2, 0.52); ctx.quadraticCurveTo(0, 0.44 + wob, 0.2, 0.52); ctx.stroke();
    whiten(ctx, body, ga, fl);
  }
  function drawBunshin(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var lx = LK.x, ly = LK.y;
    if (e.mini) { drawBunshinMini(ctx, e, t, sd, ga, fl, lx, ly); return; }
    var br = Math.sin(t * 6 + sd), gap = 0.31 + 0.05 * br, s;
    function lobe(sg) { ctx.beginPath(); ctx.ellipse(sg * gap, 0.06 + sg * 0.035 * br, 0.64, 0.76, sg * 0.14, 0, TAU); }
    function both() { ctx.beginPath(); ctx.ellipse(-gap, 0.06, 0.64, 0.76, -0.14, 0, TAU); ctx.moveTo(gap + 0.64, 0.06); ctx.ellipse(gap, 0.06, 0.64, 0.76, 0.14, 0, TAU); }
    bleed(ctx, both, ga);
    for (s = -1; s <= 1; s += 2) {
      // 頭の跳ね毛
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.moveTo(s * gap, -0.66); ctx.quadraticCurveTo(s * (gap + 0.05), -0.9, s * (gap + 0.22 + 0.05 * br), -0.98); ctx.stroke();
      lobe(s); ctx.fillStyle = s < 0 ? '#3f7a70' : '#7fb09a'; ctx.fill();
      ctx.globalAlpha = ga * 0.28; ctx.fillStyle = '#f2ead8';
      ctx.beginPath(); ctx.ellipse(s * gap - 0.2, -0.32, 0.2, 0.13, -0.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = ga; lobe(s); ctx.lineWidth = 0.065; ctx.stroke();
    }
    // 切り取り線
    ctx.strokeStyle = '#f6eeda'; ctx.lineWidth = 0.05;
    if (ctx.setLineDash) ctx.setLineDash([0.1, 0.1]);
    ctx.beginPath(); ctx.moveTo(0, -0.52); ctx.lineTo(0, 0.66); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    eye(ctx, -gap - 0.08, -0.08, 0.2, lx, ly); eye(ctx, gap + 0.08, -0.08, 0.2, lx, ly);
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.055;
    ctx.beginPath(); ctx.moveTo(-0.34, 0.34); ctx.lineTo(-0.17, 0.26); ctx.lineTo(0, 0.36); ctx.lineTo(0.17, 0.26); ctx.lineTo(0.34, 0.34); ctx.stroke();
    ctx.globalAlpha = ga * 0.5; ctx.fillStyle = C.shu;
    ctx.beginPath(); ctx.arc(-gap - 0.36, 0.18, 0.07, 0, TAU); ctx.arc(gap + 0.36, 0.18, 0.07, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
    whiten(ctx, both, ga, fl);
  }

  // 盾持ち: 一つ目の足軽。進む向き(e.face)に木の盾、背中に朱の結び紐（そこが斬りどころ）
  function drawTate(ctx, e, t, sd, ga, fl) {
    var face = num(e.face, Math.PI / 2), fcx = Math.cos(face), fcy = Math.sin(face), gd = clamp(num(e.guard, 0), 0, 1), i;
    var bob = Math.sin(t * 7 + sd) * 0.035, fl2 = Math.sin(t * 8 + sd) * 0.07;
    function body() { ctx.beginPath(); ctx.ellipse(0, 0.14 + bob, 0.6, 0.64, 0, 0, TAU); }
    // 背中の結び紐
    ctx.save(); ctx.rotate(face);
    ctx.fillStyle = C.shu; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(-1.04, -0.24 + fl2); ctx.lineTo(-0.96, -0.02 + fl2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(-1.04, 0.24 - fl2); ctx.lineTo(-0.94, 0.04 - fl2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.64, 0, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 足
    ctx.fillStyle = C.sumi;
    var stp = Math.sin(t * 9 + sd) * 0.07;
    ctx.beginPath(); ctx.ellipse(-0.24, 0.8 + stp, 0.17, 0.08, 0, 0, TAU); ctx.ellipse(0.24, 0.8 - stp, 0.17, 0.08, 0, 0, TAU); ctx.fill();
    bleed(ctx, body, ga);
    body(); ctx.fillStyle = '#d6cbae'; ctx.fill();
    ctx.globalAlpha = ga * 0.22; ctx.fillStyle = C.sumi;
    ctx.beginPath(); ctx.ellipse(0.1, 0.46 + bob, 0.44, 0.26, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga; body(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.06; ctx.stroke();
    // 陣笠
    ctx.beginPath(); ctx.moveTo(-0.7, -0.26 + bob); ctx.lineTo(0, -0.98 + bob); ctx.lineTo(0.7, -0.26 + bob);
    ctx.quadraticCurveTo(0, -0.1 + bob, -0.7, -0.26 + bob); ctx.closePath();
    ctx.fillStyle = '#1d1915'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(-0.5, -0.31 + bob); ctx.quadraticCurveTo(0, -0.2 + bob, 0.5, -0.31 + bob); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.52 + bob, 0.075, 0, TAU); ctx.fillStyle = C.gold; ctx.fill();
    eye(ctx, fcx * 0.1, 0.12 + bob, 0.25, fcx, fcy);
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(-0.12, 0.52 + bob); ctx.lineTo(0.12, 0.52 + bob); ctx.stroke();
    whiten(ctx, body, ga, fl);
    // 盾（正面 ±65°）
    ctx.save(); ctx.rotate(face); ctx.translate(-gd * 0.1, 0);
    var a0 = 1.13, ro = 1.16, ri = 0.86;
    function shield() { ctx.beginPath(); ctx.arc(0, 0, ro, -a0, a0); ctx.arc(0, 0, ri, a0, -a0, true); ctx.closePath(); }
    ctx.save(); ctx.scale(1.06, 1.06); shield(); ctx.restore();
    ctx.globalAlpha = ga * 0.16; ctx.fillStyle = C.sumi; ctx.fill(); ctx.globalAlpha = ga;
    shield(); ctx.fillStyle = '#a9824c'; ctx.fill();
    ctx.globalAlpha = ga * 0.3; ctx.strokeStyle = '#5c3f1c'; ctx.lineWidth = 0.025; // 木目
    ctx.beginPath(); ctx.arc(0, 0, 0.95, -a0 + 0.1, a0 - 0.25); ctx.moveTo(Math.cos(-a0 + 0.3) * 1.06, Math.sin(-a0 + 0.3) * 1.06); ctx.arc(0, 0, 1.06, -a0 + 0.3, a0 - 0.1); ctx.stroke();
    ctx.globalAlpha = ga; shield(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.065; ctx.stroke();
    ctx.strokeStyle = '#3a2a16'; ctx.lineWidth = 0.05; // 鉄の帯
    for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(Math.cos(i * 0.62) * ri, Math.sin(i * 0.62) * ri); ctx.lineTo(Math.cos(i * 0.62) * ro, Math.sin(i * 0.62) * ro); ctx.stroke(); }
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.02; // 鋲
    for (i = -2; i <= 2; i++) { if (i === 0) continue; ctx.beginPath(); ctx.arc(Math.cos(i * 0.42) * 1.01, Math.sin(i * 0.42) * 1.01, 0.05, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(1.01, 0, 0.115, 0, TAU); ctx.fillStyle = C.shu; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke();
    if (gd > 0) { // 弾いた瞬間の光
      shield(); ctx.globalAlpha = ga * gd * 0.85; ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#f0d470'; ctx.lineWidth = 0.05 + gd * 0.08; ctx.beginPath(); ctx.arc(0, 0, ro + 0.08 + (1 - gd) * 0.25, -a0, a0); ctx.stroke();
      ctx.globalAlpha = ga;
    }
    ctx.restore();
  }

  // 突進妖: 猪。e.phase = approach | aim（身を引いて震える）| rush（伸びて突っ込む）
  function drawTosshin(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var aim = e.phase === 'aim', rush = e.phase === 'rush', k = rush ? 1 : aim ? clamp(num(e.aim, 0), 0, 1) : 0, i;
    var hd = (aim || rush) && isFinite(+e.ang) ? +e.ang : (LK.sp > 1 ? Math.atan2(LK.y, LK.x) : num(e.ang, 0));
    if (aim) ctx.translate(Math.sin(t * 70) * 0.045 * k, Math.cos(t * 83) * 0.045 * k);
    ctx.rotate(hd); if (Math.cos(hd) < 0) ctx.scale(1, -1);
    if (rush) {
      ctx.strokeStyle = C.sumi; // 速度線
      for (i = 0; i < 5; i++) {
        var f = (t * 6 + i * 0.37) % 1, ly0 = -0.5 + i * 0.25, x0 = -1.0 - f * 1.3;
        ctx.globalAlpha = ga * 0.55 * (1 - f); ctx.lineWidth = 0.04 + (i % 2) * 0.03;
        ctx.beginPath(); ctx.moveTo(x0, ly0); ctx.lineTo(x0 - 0.55 - (i % 3) * 0.2, ly0); ctx.stroke();
      }
      ctx.globalAlpha = ga; ctx.scale(1.16, 0.88);
    } else if (aim) {
      ctx.translate(-0.14 * k, 0);
    }
    if (k > 0) { // 怒りの気
      ctx.globalAlpha = ga * 0.22 * k * (0.7 + 0.3 * Math.sin(t * 22)); ctx.fillStyle = C.shu;
      ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.86, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = ga;
    }
    // 脚
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.14;
    var LXS = [-0.5, -0.24, 0.2, 0.44], sp = rush ? 30 : aim ? 0 : 14;
    for (i = 0; i < 4; i++) {
      var sw = Math.sin(t * sp + i * 1.7) * (rush ? 0.3 : 0.14);
      if (aim && i === 3) sw = -0.2 + Math.sin(t * 16) * 0.22 * k; // 前脚で地を掻く
      ctx.beginPath(); ctx.moveTo(LXS[i], 0.3); ctx.lineTo(LXS[i] + sw, 0.66); ctx.stroke();
    }
    // しっぽ
    ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.78, -0.08); ctx.quadraticCurveTo(-1.0, -0.3, -0.9, -0.42 + Math.sin(t * 9 + sd) * 0.06); ctx.stroke();
    function body() {
      ctx.beginPath(); ctx.ellipse(-0.08, 0, 0.76, 0.5, 0, 0, TAU);
      ctx.moveTo(1.0, 0.1); ctx.ellipse(0.68, 0.1, 0.32, 0.27, 0.15, 0, TAU);
    }
    // たてがみ
    ctx.fillStyle = C.sumi; ctx.beginPath();
    for (i = 0; i < 6; i++) {
      var mx = -0.62 + i * 0.2, my = -0.5 * Math.sqrt(Math.max(0, 1 - ((mx + 0.08) / 0.76) * ((mx + 0.08) / 0.76))), hh = 0.2 + k * 0.1 + 0.03 * Math.sin(t * 12 + i);
      ctx.moveTo(mx - 0.1, my + 0.06); ctx.lineTo(mx - 0.08, my - hh); ctx.lineTo(mx + 0.1, my + 0.06);
    }
    ctx.fill();
    bleed(ctx, body, ga);
    body(); ctx.fillStyle = '#5a3d2e'; ctx.fill();
    ctx.globalAlpha = ga * 0.35; ctx.fillStyle = '#8a644a'; // 腹の明るみ
    ctx.beginPath(); ctx.ellipse(-0.1, 0.2, 0.55, 0.22, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = ga * 0.5; ctx.strokeStyle = '#2c1c14'; ctx.lineWidth = 0.05; // うり坊の縞
    ctx.beginPath(); ctx.moveTo(-0.55, -0.2); ctx.lineTo(-0.1, -0.26); ctx.moveTo(-0.6, 0.0); ctx.lineTo(-0.2, -0.05); ctx.stroke();
    ctx.globalAlpha = ga; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.ellipse(-0.08, 0, 0.76, 0.5, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0.68, 0.1, 0.32, 0.27, 0.15, -1.9, 1.75); ctx.stroke();
    // 耳
    ctx.beginPath(); ctx.moveTo(0.2, -0.4); ctx.lineTo(0.3, -0.68); ctx.lineTo(0.46, -0.36); ctx.closePath(); ctx.fillStyle = '#3d281d'; ctx.fill(); ctx.lineWidth = 0.04; ctx.stroke();
    // 鼻
    ctx.beginPath(); ctx.ellipse(0.99, 0.13, 0.085, 0.17, 0.15, 0, TAU); ctx.fillStyle = '#c98f7a'; ctx.fill(); ctx.lineWidth = 0.035; ctx.stroke();
    ctx.fillStyle = C.sumi; ctx.beginPath(); ctx.arc(1.0, 0.07, 0.022, 0, TAU); ctx.arc(1.0, 0.19, 0.022, 0, TAU); ctx.fill();
    // 牙
    ctx.beginPath(); ctx.moveTo(0.6, 0.3); ctx.quadraticCurveTo(0.84, 0.34, 0.9, -0.02); ctx.quadraticCurveTo(0.76, 0.18, 0.64, 0.19); ctx.closePath();
    ctx.fillStyle = '#fbf7ea'; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke();
    // 目
    eye(ctx, 0.52, -0.1, 0.13, 0.6, 0.1);
    if (k > 0.3) { ctx.beginPath(); ctx.arc(0.55, -0.095, 0.07, 0, TAU); ctx.fillStyle = C.shu; ctx.fill(); }
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.075;
    ctx.beginPath(); ctx.moveTo(0.36, -0.3); ctx.lineTo(0.68, -0.17); ctx.stroke();
    if (aim) { // 鼻息
      for (i = 0; i < 2; i++) {
        var pf = (t * 2.6 + i * 0.5) % 1;
        ctx.globalAlpha = ga * 0.6 * (1 - pf) * k; ctx.fillStyle = '#fbf7ea'; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.arc(1.12 + pf * 0.45, 0.14 + (i ? 0.1 : -0.08) * pf * 2, 0.06 + pf * 0.1, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = ga;
    }
    whiten(ctx, body, ga, fl);
  }

  // 煙の妖: 輪郭のない煙。筆はすり抜け(e.wisp で散る)、囲まれると封じられる
  function drawKemuri(ctx, e, t, sd, ga, fl) {
    lookDir(e, LK);
    var wp = clamp(num(e.wisp, 0), 0, 1), i, a, sk = 1 + wp * 0.5, lx = LK.x, ly = LK.y;
    // 「囲め」の目印: ゆっくり回る破線の輪
    ctx.globalAlpha = ga * 0.45; ctx.strokeStyle = '#5b5f73'; ctx.lineWidth = 0.035;
    if (ctx.setLineDash) ctx.setLineDash([0.16, 0.14]);
    ctx.beginPath(); ctx.arc(0, 0, 1.06 + 0.03 * Math.sin(t * 3), t * 0.6, t * 0.6 + TAU); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    // 立ちのぼる尾
    for (i = 0; i < 4; i++) {
      var pf = (t * 0.55 + i * 0.25 + sd) % 1;
      ctx.globalAlpha = ga * 0.3 * (1 - pf); ctx.fillStyle = '#8d90a3';
      ctx.beginPath(); ctx.arc(Math.sin(pf * 5 + i * 2 + sd) * 0.22, -0.5 - pf * 0.85, 0.3 * (1 - pf * 0.6), 0, TAU); ctx.fill();
    }
    // 煙の玉
    for (i = 0; i < 9; i++) {
      a = i / 9 * TAU + t * 0.7 + sd;
      var rr = (i % 3 === 0 ? 0.5 : 0.36) * sk, br = (0.38 + 0.07 * Math.sin(t * 2.3 + i * 1.9)) * (1 + wp * 0.15);
      ctx.globalAlpha = ga * (0.36 - wp * 0.16); ctx.fillStyle = i % 2 ? '#6f7385' : '#8d90a3';
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.85 + 0.05, br, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = ga * (0.6 - wp * 0.3); ctx.fillStyle = '#4f5368';
    ctx.beginPath(); ctx.arc(0, 0.05, 0.56, 0, TAU); ctx.fill();
    // 渦の筆線
    ctx.globalAlpha = ga * 0.45; ctx.strokeStyle = '#e4e2ea'; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.arc(0.02, 0.3, 0.2, t * 1.6, t * 1.6 + 4.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.42, -0.3, 0.13, -t * 1.3, -t * 1.3 + 4); ctx.stroke();
    // うつろな目と口
    ctx.globalAlpha = ga * (1 - wp * 0.5);
    for (i = -1; i <= 1; i += 2) {
      ctx.save(); ctx.translate(i * 0.22 + lx * 0.06, -0.1 + ly * 0.05); ctx.rotate(i * 0.25);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.1, 0.17, 0, 0, TAU); ctx.fillStyle = '#fff4c8'; ctx.fill();
      ctx.strokeStyle = '#2b2d3a'; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(lx * 0.06, 0.24 + ly * 0.05, 0.075, 0.1 + 0.03 * Math.sin(t * 3 + sd), 0, 0, TAU); ctx.fillStyle = '#2b2d3a'; ctx.fill();
    ctx.globalAlpha = ga;
    whiten(ctx, function () { ctx.beginPath(); ctx.arc(0, 0.02, 0.85, 0, TAU); }, ga, fl);
  }

  var ENEMY = { hitodama: drawHitodama, karasu: drawKarasu, chochin: drawChochin, daruma: drawDaruma, kasa: drawKasa, boss: drawBoss,
    bunshin: drawBunshin, tate: drawTate, tosshin: drawTosshin, kemuri: drawKemuri };

  // ---------------------------------------------------------------- 突進の予兆・溜め
  // 突進妖から柳へ伸びる朱の点線（k: 0→1 で伸びて濃くなる）
  FX.drawAimLine = function (ctx, x1, y1, x2, y2, k) {
    if (!ctx) return;
    k = clamp(num(k, 0), 0, 1);
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy); if (!(L > 1)) return;
    var ux = dx / L, uy = dy / L, len = L * easeOut(Math.min(1, k * 1.6)), full = k >= 1;
    ctx.save();
    ctx.lineCap = 'butt'; ctx.strokeStyle = C.shu;
    ctx.globalAlpha *= full ? 0.8 + 0.2 * Math.sin(clock * 40) : 0.4 + 0.5 * k;
    ctx.lineWidth = U * (0.5 + 0.9 * k);
    if (ctx.setLineDash) { ctx.setLineDash([U * 2.4, U * 1.6]); ctx.lineDashOffset = -clock * U * 26; }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * len, y1 + uy * len); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    // 矢じり
    var hx = x1 + ux * len, hy = y1 + uy * len, s = U * (1.4 + 1.2 * k);
    ctx.fillStyle = C.shu; ctx.beginPath();
    ctx.moveTo(hx + ux * s, hy + uy * s); ctx.lineTo(hx - ux * s * 0.6 - uy * s * 0.8, hy - uy * s * 0.6 + ux * s * 0.8);
    ctx.lineTo(hx - ux * s * 0.6 + uy * s * 0.8, hy - uy * s * 0.6 - ux * s * 0.8); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // 溜め: 墨が穂先に集まる（k: 0→1）。ready で金の光
  FX.drawCharge = function (ctx, x, y, k, isReady) {
    if (!ctx) return;
    k = clamp(num(k, 0), 0, 1);
    var i, R = U * (9 - 5 * k), t = clock;
    ctx.save(); ctx.translate(num(x, 0), num(y, 0)); ctx.lineCap = 'round';
    var ga = ctx.globalAlpha;
    if (isReady) {
      var pu = 0.5 + 0.5 * Math.sin(t * 16);
      ctx.globalAlpha = ga * (0.28 + 0.14 * pu); ctx.fillStyle = '#f0d470';
      ctx.beginPath(); ctx.arc(0, 0, U * (5.2 + 0.8 * pu), 0, TAU); ctx.fill();
      ctx.globalAlpha = ga * 0.95; ctx.strokeStyle = C.gold; ctx.lineWidth = U * 0.7;
      ctx.beginPath(); ctx.arc(0, 0, U * 4, 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.sumi; ctx.lineWidth = U * 0.22;
      ctx.beginPath(); ctx.arc(0, 0, U * 4.45, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fffbe8'; ctx.globalAlpha = ga; // 四方の光芒
      ctx.rotate(t * 2.2); ctx.beginPath();
      for (i = 0; i < 4; i++) {
        var a = i * Math.PI / 2, l = U * (3.2 + 1.2 * pu), w = U * 0.55;
        ctx.moveTo(Math.cos(a) * l, Math.sin(a) * l);
        ctx.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
        ctx.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
      }
      ctx.fill();
    } else {
      ctx.globalAlpha = ga * 0.2; ctx.strokeStyle = C.sumi; ctx.lineWidth = U * 0.6;
      ctx.beginPath(); ctx.arc(0, 0, U * 4, 0, TAU); ctx.stroke();
      ctx.globalAlpha = ga * 0.9; ctx.lineWidth = U * 0.7;
      ctx.beginPath(); ctx.arc(0, 0, U * 4, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.fillStyle = C.sumi; // 集まる墨の粒
      for (i = 0; i < 8; i++) {
        var an = i / 8 * TAU + t * 5, rr = R * (0.75 + 0.25 * Math.sin(t * 9 + i * 2.1));
        ctx.globalAlpha = ga * (0.35 + 0.5 * k);
        ctx.beginPath(); ctx.arc(Math.cos(an) * rr, Math.sin(an) * rr, U * (0.35 + 0.35 * k), 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  FX.drawEnemy = function (ctx, e) {
    if (!ctx || !e) return;
    var r = num(e.r, 0); if (!(r > 0)) r = U * 5;
    var fn = ENEMY.hasOwnProperty(e.type) ? ENEMY[e.type] : drawHitodama;
    ctx.save();
    ctx.translate(num(e.x, 0), num(e.y, 0)); ctx.scale(r, r);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx, e, num(e.t, 0), num(e.seed, 0) * 1.618, ctx.globalAlpha, clamp(num(e.flash, 0), 0, 1));
    ctx.restore();
  };

  // ---------------------------------------------------------------- 哲平
  var SKIN = '#f3d6ad';
  function teppeiBody(ctx, t, mode, dir) {
    var dash = mode === 'dash', ouch = mode === 'ouch';
    var ph = t * (dash ? 26 : 9), sw = ouch ? 0.25 : Math.sin(ph), cw = Math.cos(ph);
    var bob = ouch ? 0 : Math.abs(cw) * (dash ? 0.03 : 0.05), i, s;
    ctx.translate(ouch ? Math.sin(t * 38) * 0.03 : 0, -bob);
    var stride = dash ? 0.42 : ouch ? 0.1 : 0.2;
    // 脚
    for (i = 0; i < 2; i++) {
      s = i === 0 ? -1 : 1;
      var fx = s * sw * stride + s * 0.07, lift = ouch ? 0 : Math.max(0, -s * cw) * (dash ? 0.2 : 0.1), fy = 0.92 - lift + bob;
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(s * 0.1, 0.58); ctx.quadraticCurveTo((s * 0.1 + fx) / 2 + 0.05, 0.76 - lift * 0.5, fx, fy - 0.03); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(fx + 0.05, fy + 0.02, 0.14, 0.065, 0, 0, TAU); ctx.fillStyle = '#f6eeda'; ctx.fill();
      ctx.lineWidth = 0.035; ctx.stroke();
    }
    // 奥の腕
    var armA = ouch ? 0 : -sw * 0.24;
    if (dash) { ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.19; ctx.beginPath(); ctx.moveTo(-0.2, 0.22); ctx.lineTo(-0.58, 0.36); ctx.stroke(); ctx.strokeStyle = '#34466e'; ctx.lineWidth = 0.12; ctx.stroke(); }
    // 鉢巻きの尾
    var fl1 = Math.sin(t * (dash ? 30 : 7)) * (dash ? 0.05 : 0.08), tl = dash ? 0.75 : 0.42;
    ctx.fillStyle = '#fbf7ea'; ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.03;
    for (i = 0; i < 2; i++) {
      var ty = -0.5 + i * 0.1 + (dash ? 0 : 0.12);
      ctx.beginPath(); ctx.moveTo(-0.43, -0.56); ctx.quadraticCurveTo(-0.43 - tl * 0.5, ty - 0.12 + fl1, -0.43 - tl, ty + fl1 * (i ? -1.5 : 1.5));
      ctx.lineTo(-0.43 - tl + 0.04, ty + 0.1 + fl1); ctx.quadraticCurveTo(-0.43 - tl * 0.5, ty + fl1 * 0.5, -0.4, -0.46); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // 法被
    ctx.beginPath(); ctx.moveTo(-0.3, 0.1); ctx.quadraticCurveTo(-0.44, 0.38, -0.42, 0.68); ctx.lineTo(0.42, 0.68);
    ctx.quadraticCurveTo(0.44, 0.38, 0.3, 0.1); ctx.closePath();
    ctx.fillStyle = C.ai; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.028; // 裾の波模様
    ctx.beginPath(); ctx.moveTo(-0.38, 0.63);
    for (i = 0; i < 6; i++) ctx.quadraticCurveTo(-0.38 + (i + 0.5) * 0.127, 0.585, -0.38 + (i + 1) * 0.127, 0.63);
    ctx.stroke();
    ctx.strokeStyle = C.shu; ctx.lineWidth = 0.07; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-0.42, 0.535); ctx.lineTo(0.42, 0.535); ctx.stroke(); ctx.lineCap = 'round';
    // 「哲」の紋
    ctx.beginPath(); ctx.arc(0.0, 0.32, 0.165, 0, TAU); ctx.fillStyle = '#f6eeda'; ctx.fill();
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.025; ctx.stroke();
    ctx.save(); ctx.translate(0, 0.325); ctx.scale(dir * 0.01, 0.01);
    ctx.font = '25px ' + FONT_BRUSH; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ai; ctx.fillText('哲', 0, 1);
    ctx.restore();
    // 手前の腕
    var hxx, hyy;
    if (dash) { hxx = 0.62; hyy = 0.2; } else if (ouch) { hxx = 0.42; hyy = -0.02; } else { hxx = 0.26 + armA; hyy = 0.5 - Math.abs(armA) * 0.2; }
    if (dash) { // 木刀
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(0.5, 0.27); ctx.lineTo(1.3, -0.16); ctx.stroke();
      ctx.strokeStyle = '#b08a52'; ctx.lineWidth = 0.055; ctx.beginPath(); ctx.moveTo(0.5, 0.27); ctx.lineTo(1.3, -0.16); ctx.stroke();
    }
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(0.24, 0.2); ctx.lineTo(hxx, hyy); ctx.stroke();
    ctx.strokeStyle = '#34466e'; ctx.lineWidth = 0.13; ctx.stroke();
    ctx.beginPath(); ctx.arc(hxx, hyy, 0.08, 0, TAU); ctx.fillStyle = SKIN; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.03; ctx.stroke();
    if (ouch) {
      ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(-0.24, 0.2); ctx.lineTo(-0.44, -0.02); ctx.stroke();
      ctx.strokeStyle = '#34466e'; ctx.lineWidth = 0.13; ctx.stroke();
      ctx.beginPath(); ctx.arc(-0.44, -0.02, 0.08, 0, TAU); ctx.fillStyle = SKIN; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.03; ctx.stroke();
    }
    // 頭
    var hx = 0.04, hy = -0.36;
    ctx.beginPath(); ctx.arc(hx, hy, 0.5, 0, TAU); ctx.fillStyle = SKIN; ctx.fill(); ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.45, -0.5); ctx.lineTo(-0.58, -0.72); ctx.lineTo(-0.38, -0.7); ctx.lineTo(-0.4, -0.93); ctx.lineTo(-0.16, -0.8);
    ctx.lineTo(0.0, -1.0); ctx.lineTo(0.14, -0.8); ctx.lineTo(0.36, -0.92); ctx.lineTo(0.38, -0.7); ctx.lineTo(0.6, -0.7); ctx.lineTo(0.52, -0.48);
    ctx.quadraticCurveTo(0.04, -0.68, -0.45, -0.5); ctx.closePath(); ctx.fillStyle = C.sumi; ctx.fill();
    if (ouch) { // たんこぶ
      ctx.beginPath(); ctx.ellipse(-0.12, -0.93, 0.13, 0.11, 0, 0, TAU); ctx.fillStyle = '#f2a48c'; ctx.fill(); ctx.lineWidth = 0.035; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.arc(-0.14, -0.95, 0.06, 3.4, 4.6); ctx.stroke();
    }
    ctx.strokeStyle = C.sumi; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(-0.44, -0.5); ctx.quadraticCurveTo(0.04, -0.68, 0.52, -0.47); ctx.stroke();
    ctx.strokeStyle = '#fbf7ea'; ctx.lineWidth = 0.105; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.22, -0.585, 0.04, 0, TAU); ctx.fillStyle = C.shu; ctx.fill();
    // 顔
    var ex1 = 0.1, ex2 = 0.37, ey = -0.3;
    ctx.strokeStyle = C.sumi; ctx.fillStyle = C.sumi;
    if (ouch) {
      ctx.lineWidth = 0.045; ctx.beginPath();
      for (i = 0; i < 2; i++) { var cx = i ? ex2 : ex1; ctx.moveTo(cx - 0.07, ey - 0.07); ctx.lineTo(cx + 0.07, ey + 0.07); ctx.moveTo(cx + 0.07, ey - 0.07); ctx.lineTo(cx - 0.07, ey + 0.07); }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.1, -0.09); ctx.quadraticCurveTo(0.17, -0.15, 0.24, -0.09); ctx.quadraticCurveTo(0.31, -0.03, 0.38, -0.09);
      ctx.lineTo(0.36, 0.0); ctx.quadraticCurveTo(0.24, 0.05, 0.12, 0.0); ctx.closePath(); ctx.fillStyle = '#8f1f12'; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke();
      ctx.fillStyle = '#7fb4dc'; // 涙
      for (i = 0; i < 4; i++) {
        var tp = (t * 1.8 + i * 0.25) % 1, sdx = i % 2 ? 1 : -1, bx0 = i % 2 ? ex2 + 0.08 : ex1 - 0.08;
        var tx = bx0 + sdx * tp * 0.4, tyy = ey + 0.03 - Math.sin(tp * Math.PI) * 0.25 + tp * 0.3;
        ctx.beginPath(); ctx.arc(tx, tyy, 0.05 * (1 - tp * 0.5), 0, TAU); ctx.fill();
      }
    } else {
      ctx.beginPath(); ctx.ellipse(ex1, ey, 0.048, 0.075, 0, 0, TAU); ctx.ellipse(ex2, ey, 0.048, 0.075, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex1 + 0.015, ey - 0.03, 0.018, 0, TAU); ctx.arc(ex2 + 0.015, ey - 0.03, 0.018, 0, TAU); ctx.fill();
      ctx.lineWidth = 0.05; ctx.beginPath();
      if (dash) { ctx.moveTo(ex1 - 0.09, ey - 0.2); ctx.lineTo(ex1 + 0.07, ey - 0.13); ctx.moveTo(ex2 + 0.09, ey - 0.2); ctx.lineTo(ex2 - 0.07, ey - 0.13); }
      else { ctx.moveTo(ex1 - 0.07, ey - 0.15); ctx.lineTo(ex1 + 0.06, ey - 0.17); ctx.moveTo(ex2 - 0.06, ey - 0.17); ctx.lineTo(ex2 + 0.07, ey - 0.15); }
      ctx.stroke();
      if (dash) {
        ctx.beginPath(); ctx.ellipse(0.25, -0.09, 0.11, 0.085, 0, 0, TAU); ctx.fillStyle = '#8f1f12'; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke();
      } else {
        ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(0.24, -0.16, 0.1, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      }
    }
    ctx.globalAlpha *= 0.5; ctx.fillStyle = C.shu;
    ctx.beginPath(); ctx.arc(-0.03, -0.15, 0.07, 0, TAU); ctx.arc(0.46, -0.15, 0.065, 0, TAU); ctx.fill();
  }

  FX.drawTeppei = function (ctx, p) {
    if (!ctx || !p) return;
    var r = num(p.r, 0); if (!(r > 0)) r = U * 6;
    var t = num(p.t, 0), dir = p.dir < 0 ? -1 : 1, mode = p.mode, i;
    ctx.save();
    if (mode === 'fly') mode = 'ouch';   // 吹っ飛び中は「いてっ」の顔
    ctx.translate(num(p.x, 0), num(p.y, 0));
    if (p.rot) ctx.rotate(num(p.rot, 0));
    ctx.scale(r * dir, r);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var ga = ctx.globalAlpha;
    if (mode === 'dash') {
      // 速度線と土煙
      ctx.strokeStyle = C.sumi;
      for (i = 0; i < 6; i++) {
        var f = (t * 5 + i * 0.37) % 1, y = -0.8 + i * 0.32, x0 = -0.7 - f * 1.6;
        ctx.globalAlpha = ga * 0.5 * (1 - f); ctx.lineWidth = 0.035 + (i % 2) * 0.03;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 - 0.5 - (i % 3) * 0.25, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(26,22,18,1)';
      for (i = 0; i < 3; i++) {
        var d = (t * 3 + i * 0.33) % 1;
        ctx.globalAlpha = ga * 0.22 * (1 - d);
        ctx.beginPath(); ctx.arc(-0.5 - d * 1.3, 0.92 - d * 0.2, 0.1 + d * 0.16, 0, TAU); ctx.fill();
      }
      // 残像
      for (i = 3; i >= 1; i--) {
        ctx.globalAlpha = ga * (0.26 - i * 0.065); ctx.fillStyle = C.ai;
        ctx.save(); ctx.translate(-i * 0.5, 0); ctx.rotate(0.3);
        ctx.beginPath(); ctx.arc(0.04, -0.36, 0.5, 0, TAU); ctx.ellipse(0, 0.4, 0.42, 0.34, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = ga;
      ctx.rotate(0.3);
    } else if (mode === 'ouch') {
      ctx.strokeStyle = C.shu; ctx.lineWidth = 0.05; // 痛みの放射線
      ctx.beginPath();
      for (i = 0; i < 5; i++) { var a = -Math.PI * 0.5 + (i - 2) * 0.42, r0 = 1.12 + 0.05 * Math.sin(t * 20 + i); ctx.moveTo(Math.cos(a) * r0 - 0.1, Math.sin(a) * r0 - 0.3); ctx.lineTo(Math.cos(a) * (r0 + 0.2) - 0.1, Math.sin(a) * (r0 + 0.2) - 0.3); }
      ctx.stroke();
    }
    teppeiBody(ctx, t, mode, dir);
    ctx.restore();
  };

  // ---------------------------------------------------------------- 筆の軌跡
  FX.drawTrail = function (ctx, pts, o) {
    if (!ctx || !pts || !(pts.length >= 2)) return;
    o = o || {};
    var color = o.color || C.sumi, width = o.width > 0 ? o.width : Math.max(5, U * 2.6), power = !!o.power;
    if (power) width *= 1.9;
    var n0 = pts.length, st = Math.max(0, n0 - 44), n = 0, i, j;
    var last = pts[n0 - 1]; if (!last) return;
    var tNew = num(last.t, NaN), useAge = isFinite(tNew);
    for (i = st; i < n0 - 1; i++) {
      var p0 = pts[i > st ? i - 1 : i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < n0 ? i + 2 : i + 1];
      if (!p0 || !p1 || !p2 || !p3) continue;
      var dx = p2.x - p1.x, dy = p2.y - p1.y, seg = Math.sqrt(dx * dx + dy * dy);
      if (!(seg > 0.01)) continue;
      var sub = seg > 26 ? 5 : seg > 12 ? 3 : seg > 5 ? 2 : 1;
      for (j = 0; j < sub && n < RMAX - 2; j++) {
        var u = j / sub, u2 = u * u, u3 = u2 * u;
        RX[n] = 0.5 * (2 * p1.x + (p2.x - p0.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * u3);
        RY[n] = 0.5 * (2 * p1.y + (p2.y - p0.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * u3);
        RA[n] = useAge ? tNew - lerp(num(p1.t, tNew), num(p2.t, tNew), u) : 0;
        n++;
      }
    }
    RX[n] = last.x; RY[n] = last.y; RA[n] = 0; n++;
    if (n < 2) return;
    RS[0] = 0;
    for (i = 1; i < n; i++) { var ddx = RX[i] - RX[i - 1], ddy = RY[i] - RY[i - 1]; RS[i] = RS[i - 1] + Math.sqrt(ddx * ddx + ddy * ddy); }
    var L = RS[n - 1]; if (!(L > 1)) return;
    var hw = width * 0.5 * clamp(L / (width * 2.5), 0.35, 1);
    for (i = 0; i < n; i++) {
      var f = RS[i] / L, w = hw * Math.pow(f, 0.5);                      // 古い側は細く払う
      if (f > 0.88) w *= 0.3 + 0.7 * Math.sqrt(Math.max(0, (1 - f) / 0.12)); // 穂先
      w *= 0.86 + 0.14 * Math.sin(RS[i] * 0.05 + L * 0.013);                 // 筆圧のむら
      if (useAge) w *= clamp(1 - RA[i] * 1.5, 0.3, 1);
      RW[i] = w;
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var ga = ctx.globalAlpha;
    if (power) { // 剛筆: 金の気をまとう
      for (i = 0; i < n; i++) RW[i] *= 1.5;
      ctx.globalAlpha = ga * 0.55; ctx.fillStyle = '#f0d470'; fillRibbon(ctx, n);
      for (i = 0; i < n; i++) RW[i] /= 1.5;
    }
    ctx.globalAlpha = ga * 0.93; ctx.fillStyle = color;
    fillRibbon(ctx, n);
    // はみ出した毛筋
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.7, width * 0.055); ctx.globalAlpha = ga * 0.55;
    var k, on;
    for (k = 0; k < 2; k++) {
      var side = k ? 1 : -1; on = false; ctx.beginPath();
      for (i = 0; i < n; i++) {
        var ff = RS[i] / L, vis = ff > 0.02 && ff < 0.66 && Math.sin(RS[i] * 0.045 + k * 2.3) > -0.35;
        if (!vis) { on = false; continue; }
        var off = RW[i] * 1.28 + width * 0.07, qx = RX[i] + NX[i] * off * side, qy = RY[i] + NY[i] * off * side;
        if (on) ctx.lineTo(qx, qy); else { ctx.moveTo(qx, qy); on = true; }
      }
      ctx.stroke();
    }
    // かすれ（紙の白が抜ける）
    ctx.strokeStyle = '#f6efde'; ctx.lineWidth = Math.max(0.7, width * 0.06);
    var KO = [-0.55, 0.12, 0.6];
    for (k = 0; k < 3; k++) {
      on = false; ctx.globalAlpha = ga * (0.6 - k * 0.1); ctx.beginPath();
      for (i = 0; i < n; i++) {
        var f2 = RS[i] / L, v2 = f2 > 0.06 && f2 < 0.74 - k * 0.08 && Math.sin(RS[i] * 0.036 + k * 1.9 + L * 0.02) > -0.15;
        if (!v2) { on = false; continue; }
        var x2 = RX[i] + NX[i] * RW[i] * KO[k], y2 = RY[i] + NY[i] * RW[i] * KO[k];
        if (on) ctx.lineTo(x2, y2); else { ctx.moveTo(x2, y2); on = true; }
      }
      ctx.stroke();
    }
    // 穂先の光
    ctx.globalAlpha = ga * 0.5; ctx.lineWidth = Math.max(0.8, width * 0.1); ctx.beginPath(); on = false;
    for (i = 0; i < n; i++) {
      if (RS[i] / L < 0.72) continue;
      if (on) ctx.lineTo(RX[i], RY[i]); else { ctx.moveTo(RX[i], RY[i]); on = true; }
    }
    ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- 題字バナー
  var mainBanner = null, minorBanner = null, queuedBanner = null;
  var BSTYLE = {
    ichiyanagi: { dur: 1.0, prio: 3 },   // 節目の大きい「一柳！」
    ichiSmall: { dur: 0.65, prio: 2 },   // 普段の控えめな「一柳！」
    teppei: { dur: 1.05, prio: 3 },
    boss: { dur: 1.9, prio: 3 },
    fever: { dur: 1.2, prio: 3 },
    wave: { dur: 1.6, prio: 1 },
    issen: { dur: 0.75, prio: 2, minor: true }
  };
  var sprCache = {}, bandCache = {}, sealCv = null, sealGen = -1;
  var FLECK = (function () { var R = mulberry(555), a = []; for (var i = 0; i < 46 * 4; i++) a.push(R()); return a; })();

  FX.banner = function (text, o) {
    o = o || {};
    var style = BSTYLE.hasOwnProperty(o.style) ? o.style : 'issen', def = BSTYLE[style];
    var b = { text: String(text == null ? '' : text), sub: o.sub ? String(o.sub) : '', style: style, dur: o.duration > 0 ? +o.duration : def.dur, t: 0, hit: false };
    if (!b.text) return;
    if (def.minor) { minorBanner = b; return; }
    // 控えめな一柳は、大きな題字が出ている間は出さない（待たせない）
    if (style === 'ichiSmall' && mainBanner && BSTYLE[mainBanner.style].prio > def.prio && mainBanner.dur - mainBanner.t > 0.3) return;
    if (mainBanner && def.prio < BSTYLE[mainBanner.style].prio && mainBanner.dur - mainBanner.t > 0.3) { queuedBanner = b; return; }
    mainBanner = b;
  };

  function bannerSprite(b, px, o) {
    var key = b.text + '|' + Math.round(px) + '|' + fontGen;
    var c = sprCache[b.style];
    if (!c) c = sprCache[b.style] = { cv: makeCanvas(2, 2), key: '', spr: null };
    if (c.key !== key) { o.px = px; c.spr = textSprite(c.cv, b.text, o); c.key = key; }
    return c.spr;
  }

  // 筆で払った帯
  function bandSprite(color) {
    var cv = bandCache[color]; if (cv) return cv;
    var w = 640, h = 160, R = mulberry(4242), i, y, x;
    cv = makeCanvas(w, h);
    var g = cv.getContext('2d'), n1 = R() * 10, n2 = R() * 10;
    g.fillStyle = color;
    for (y = 0; y < h; y++) {
      var v = (y + 0.5 - h / 2) / (h / 2), ed = v * v, av = Math.abs(v);
      var jj = 0.5 + 0.5 * Math.sin(y * 0.9 + n1) * Math.sin(y * 0.23 + n2);
      var x0 = w * (0.03 + 0.05 * ed * ed + 0.016 * jj);
      var x1 = w * (0.985 - 0.2 * ed * ed - 0.07 * jj * ed - 0.025 * jj);
      g.globalAlpha = 0.98 - 0.3 * ed * jj;
      if (av > 0.84) {
        var stp = w / 56;
        for (x = x0; x < x1; x += stp) {
          if (Math.sin(x * 0.05 + y * 1.7 + n1) + Math.sin(x * 0.013 + n2 + y * 0.6) > (av - 0.84) * 11 - 1.0) g.fillRect(x, y, stp + 0.5, 1.05);
        }
      } else g.fillRect(x0, y, x1 - x0, 1.05);
    }
    g.globalAlpha = 0.98; g.beginPath(); g.ellipse(w * 0.055, h * 0.5, w * 0.04, h * 0.42, 0, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (i = 0; i < 14; i++) {
      g.globalAlpha = 0.08 + R() * 0.22;
      g.fillRect(w * (0.42 + R() * 0.4), h * (0.1 + R() * 0.8), w * (0.12 + R() * 0.45), 0.8 + R() * 1.4);
    }
    for (i = 0; i < 46; i++) {
      g.globalAlpha = 0.3 + R() * 0.6;
      g.fillRect(w * (0.8 + R() * 0.19), h * (0.06 + R() * 0.88), w * (0.04 + R() * 0.2), 0.8 + R() * 2.2);
    }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = color;
    for (i = 0; i < 18; i++) {
      g.globalAlpha = 0.55 + R() * 0.45;
      g.beginPath(); g.arc(w * (0.9 + R() * 0.1), h * (0.08 + R() * 0.84), 0.8 + R() * 3, 0, TAU); g.fill();
    }
    bandCache[color] = cv; return cv;
  }
  // 帯を左から払い、終わりは左から消す（rev: 0..1 現れ、q: 0..1 消え）
  function drawBand(ctx, color, bw, bh, rev, q) {
    var cv = bandSprite(color), a = clamp(q, 0, 1) * cv.width, b = clamp(rev, 0, 1) * cv.width;
    if (b - a < 1) return;
    ctx.drawImage(cv, a, 0, b - a, cv.height, -bw / 2 + a / cv.width * bw, -bh / 2, (b - a) / cv.width * bw, bh);
  }

  function sealSprite() {
    if (sealCv && sealGen === fontGen) return sealCv;
    var S = 160;
    if (!sealCv) sealCv = makeCanvas(S, S);
    var g = sealCv.getContext('2d'), R = mulberry(88), i;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, S, S);
    g.fillStyle = C.shu; g.beginPath();
    var m = 10, e = S - 10, rr = 14;
    g.moveTo(m + rr, m + 2); g.lineTo(e - rr, m); g.quadraticCurveTo(e, m, e + 1, m + rr); g.lineTo(e, e - rr);
    g.quadraticCurveTo(e, e, e - rr, e + 1); g.lineTo(m + rr, e); g.quadraticCurveTo(m, e, m - 1, e - rr); g.lineTo(m, m + rr);
    g.quadraticCurveTo(m, m, m + rr, m + 2); g.fill();
    g.strokeStyle = '#fbf3e0'; g.lineWidth = 3.5; g.strokeRect(m + 11, m + 11, S - 2 * m - 22, S - 2 * m - 22);
    g.fillStyle = '#fbf3e0'; g.font = '56px ' + FONT_BRUSH; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('一', S / 2, S / 2 - 29); g.fillText('柳', S / 2, S / 2 + 30);
    g.globalCompositeOperation = 'destination-out'; // 印泥のかすれ
    for (i = 0; i < 70; i++) { g.globalAlpha = 0.25 + R() * 0.6; g.beginPath(); g.arc(R() * S, R() * S, 0.6 + R() * 2.2, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    sealGen = fontGen; return sealCv;
  }

  function fitPx(b, hFrac, wFrac) {
    return Math.max(12, Math.min(H * hFrac, W * wFrac / Math.max(1, chars(b.text).length)));
  }
  function drawSub(ctx, b, y, px, alpha, fill, stroke) {
    if (!b.sub || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.font = Math.round(px) + 'px ' + FONT_BOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = px * 0.28; ctx.strokeStyle = stroke; ctx.strokeText(b.sub, 0, y);
    ctx.fillStyle = fill; ctx.fillText(b.sub, 0, y);
    ctx.globalAlpha = 1;
  }
  function veil(ctx, color, a) {
    if (a <= 0.005) return;
    ctx.globalAlpha = a; ctx.drawImage(vignette(color), 0, 0, W, H); ctx.globalAlpha = 1;
  }

  // 「一柳！」— 墨の帯を払い、筆文字がドンと入り、朱の落款と金の粒
  function drawIchiyanagi(ctx, b) {
    var t = b.t, d = b.dur, TI = 0.16, cx = W / 2, cy = H * 0.43;
    var fs = fitPx(b, 0.3, 0.84), bw = W * 1.22 + fs * 0.4, bh = fs * 1.34;
    var q = clamp((t - (d - 0.22)) / 0.22, 0, 1), tau = t - TI, i;
    var spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: '#fcf7ea', stroke: '#0e0b09', sw: fs * 0.06, shadow: C.shu, sox: fs * 0.032, soy: fs * 0.045, bold: 0.02, kasure: true });
    veil(ctx, '#120d08', 0.2 * Math.min(1, t / 0.1) * (1 - q));   // 後ろの妖が見えるよう薄く
    if (tau >= 0 && !b.hit) { b.hit = true; FX.shake(U * 0.9, 0.16); }
    ctx.save();
    var jolt = tau >= 0 ? Math.exp(-tau * 20) * Math.sin(tau * 60) * fs * 0.03 : 0;
    ctx.translate(cx, cy + jolt); ctx.rotate(-0.07);
    var rev = easeOut(t / 0.13);
    ctx.globalAlpha = 0.35;   // 帯は透けさせる
    drawBand(ctx, '#15110d', bw, bh, rev, q);
    ctx.globalAlpha = 1;
    // 帯の上下に金の細線
    ctx.fillStyle = C.gold; ctx.globalAlpha = 0.9 * (1 - q);
    var gl = bw * 0.8 * rev, gh = Math.max(1.5, fs * 0.014);
    ctx.fillRect(-bw * 0.4, -bh * 0.5 - gh * 3, gl, gh);
    ctx.fillRect(bw * 0.4 - gl, bh * 0.5 + gh * 2, gl, gh);
    ctx.globalAlpha = 1;
    // 題字
    if (t > 0.05) {
      var k = clamp((t - 0.05) / (TI - 0.05), 0, 1), sc = lerp(2.7, 1, easeIn(k) * 0.35 + k * 0.65);
      if (tau >= 0) sc = 1 - 0.1 * Math.exp(-tau * 13) * Math.sin(tau * 34 + 1.2) + q * 0.05;
      ctx.globalAlpha = Math.min(0.92, k * 2.2) * (1 - q);
      ctx.drawImage(spr.cv, -spr.w * sc / 2 + q * U * 7, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
      ctx.globalAlpha = 1;
    }
    if (tau >= 0) {
      // 着地の閃光
      if (tau < 0.2) {
        var fa = 1 - tau / 0.2;
        ctx.globalAlpha = fa * 0.9; ctx.fillStyle = '#fff8e0';
        lens(ctx, -bw * 0.5, 0, bw * 0.5, 0, fs * 0.09 * fa * fa);
        ctx.globalAlpha = 1;
      }
      // 金の粒
      var life = d - TI, fp = clamp(tau / life, 0, 1), eo = easeOut(tau / 0.55);
      ctx.fillStyle = C.gold; ctx.beginPath();
      for (i = 0; i < 46; i++) {
        var an = FLECK[i * 4] * TAU, spd = 0.35 + FLECK[i * 4 + 1] * 1.25, sz = fs * (0.012 + FLECK[i * 4 + 2] * 0.03), ph = FLECK[i * 4 + 3] * TAU;
        var dist = fs * 0.35 + spd * fs * 1.25 * eo;
        var px = Math.cos(an) * dist * 1.5, py = Math.sin(an) * dist * 0.62 + tau * tau * fs * 0.35 * spd;
        var s2 = sz * (1 - fp) * (0.55 + 0.45 * Math.sin(tau * 16 + ph));
        if (s2 < 0.3) continue;
        ctx.moveTo(px, py - s2 * 1.7); ctx.lineTo(px + s2, py); ctx.lineTo(px, py + s2 * 1.7); ctx.lineTo(px - s2, py);
      }
      ctx.fill();
      ctx.fillStyle = '#fff1b5'; ctx.beginPath();
      for (i = 0; i < 46; i += 3) {
        var an2 = FLECK[i * 4] * TAU, spd2 = 0.35 + FLECK[i * 4 + 1] * 1.25, d2 = fs * 0.35 + spd2 * fs * 1.25 * eo;
        var px2 = Math.cos(an2) * d2 * 1.5, py2 = Math.sin(an2) * d2 * 0.62 + tau * tau * fs * 0.35 * spd2;
        var s3 = fs * 0.012 * (1 - fp) * Math.max(0, Math.sin(tau * 16 + FLECK[i * 4 + 3] * TAU));
        if (s3 < 0.3) continue;
        ctx.moveTo(px2 + s3, py2); ctx.arc(px2, py2, s3, 0, TAU);
      }
      ctx.fill();
    }
    // 落款
    var ts = t - 0.27;
    if (ts > 0) {
      var ks = clamp(ts / 0.09, 0, 1), s0 = fs * 0.34, ss = s0 * lerp(1.9, 1, easeOut(ks));
      ctx.save();
      ctx.translate(Math.min(spr.w * 0.5 - fs * 0.12, W * 0.5 - s0 * 0.7) + q * U * 7, bh * 0.4); ctx.rotate(0.12);
      ctx.globalAlpha = ks * (1 - q);
      ctx.drawImage(sealSprite(), -ss / 2, -ss / 2, ss, ss);
      ctx.restore();
    }
    drawSub(ctx, b, bh * 0.5 + fs * 0.2, Math.max(13, fs * 0.15), clamp((t - 0.22) / 0.1, 0, 1) * (1 - q), C.sumi, '#fbf6e8');
    ctx.restore();
  }

  // 小さい「一柳！」— 画面上寄りに短く出る。幕・長い帯は無し、柳や妖に被らない
  function drawIchiSmall(ctx, b) {
    var t = b.t, d = b.dur, tall = H > W;
    var fs = Math.min(fitPx(b, 0.12, 0.34), U * 12), q = clamp((t - (d - 0.18)) / 0.18, 0, 1);
    var spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: '#fcf7ea', stroke: '#0e0b09', sw: fs * 0.07, shadow: C.shu, sox: fs * 0.03, soy: fs * 0.045, bold: 0.02, kasure: true });
    var k = clamp(t / 0.09, 0, 1), sc = lerp(1.6, 1, easeOut(k)) + 0.04 * Math.exp(-Math.max(0, t - 0.09) * 14) * Math.sin(t * 40);
    var a = Math.min(1, k * 2) * (1 - q);
    var cy = H * (tall ? 0.27 : 0.31), bw = spr.w * 1.55, bh = fs * 1.0;
    ctx.save();
    ctx.translate(W / 2, cy); ctx.rotate(-0.05);
    ctx.globalAlpha = 0.3 * a;   // ごく薄い短い帯
    drawBand(ctx, '#15110d', bw, bh, easeOut(t / 0.1), q);
    ctx.globalAlpha = a;
    ctx.drawImage(spr.cv, -spr.w * sc / 2 + q * U * 3, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
    drawSub(ctx, b, bh * 0.5 + fs * 0.2, Math.max(11, fs * 0.2), clamp((t - 0.12) / 0.08, 0, 1) * (1 - q), C.sumi, '#fbf6e8');
    ctx.restore();
  }

  // 帯つきの題字（てっぺい / フィーバー / 大妖）
  function drawBandBanner(ctx, b) {
    var st = b.style, t = b.t, d = b.dur, cx = W / 2, cy = H * 0.43, i;
    var q = clamp((t - (d - 0.22)) / 0.22, 0, 1);
    var fs, spr, bw, bh;
    ctx.save();
    if (st === 'teppei') {
      fs = fitPx(b, 0.2, 0.92); bw = W * 1.22 + fs * 0.4; bh = fs * 1.3;
      spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: '#fcf7ea', stroke: '#0f1626', sw: fs * 0.06, shadow: C.shu, sox: fs * 0.03, soy: fs * 0.04, bold: 0.02, kasure: true });
      ctx.translate(cx, cy); ctx.rotate(-0.05);
      drawBand(ctx, C.ai, bw, bh, easeOut(t / 0.12), q);
      // 勢いの線
      ctx.fillStyle = '#f2ead8';
      for (i = 0; i < 7; i++) {
        var f = (t * 2.6 + i * 0.37) % 1, ly = (i / 6 - 0.5) * bh * 0.78;
        ctx.globalAlpha = 0.55 * Math.sin(f * Math.PI) * (1 - q) * Math.min(1, t / 0.12);
        lens(ctx, (f - 0.6) * bw, ly, (f - 0.6) * bw + bw * 0.16, ly, bh * 0.012);
      }
      var kin = clamp((t - 0.04) / 0.2, 0, 1);
      var x = lerp(-W * 0.75, 0, easeOutBack(kin)) + Math.max(0, t - 0.24) * U * 5 + q * q * W * 0.85;
      ctx.globalAlpha = Math.min(1, kin * 3) * (1 - q * 0.7);
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      ctx.drawImage(spr.cv, x - spr.w / 2, -spr.h / 2, spr.w, spr.h);
      ctx.globalAlpha = 1;
      drawSub(ctx, b, bh * 0.5 + fs * 0.24, Math.max(13, fs * 0.2), clamp((t - 0.2) / 0.1, 0, 1) * (1 - q), C.ai, '#fbf6e8');
    } else if (st === 'fever') {
      fs = fitPx(b, 0.24, 0.9); bw = W * 1.22 + fs * 0.4; bh = fs * 1.34;
      spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: '#1a1612', stroke: '#fff6d6', sw: fs * 0.08, shadow: C.shu, sox: fs * 0.03, soy: fs * 0.04, bold: 0.02 });
      var env = Math.min(1, t / 0.12) * (1 - q);
      ctx.translate(cx, cy);
      // 後光
      ctx.fillStyle = '#e6bf3c'; ctx.globalAlpha = 0.3 * env; ctx.beginPath();
      var rr = Math.sqrt(W * W + H * H) * 0.6;
      for (i = 0; i < 12; i++) {
        var a = i / 12 * TAU + t * 0.5;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.09) * rr, Math.sin(a - 0.09) * rr); ctx.lineTo(Math.cos(a + 0.09) * rr, Math.sin(a + 0.09) * rr);
      }
      ctx.fill(); ctx.globalAlpha = 1;
      ctx.rotate(-0.06);
      drawBand(ctx, '#d4aa2a', bw, bh, easeOut(t / 0.13), q);
      ctx.fillStyle = C.shu; ctx.globalAlpha = 0.9 * env;
      ctx.fillRect(-bw * 0.4, -bh * 0.5 - fs * 0.05, bw * 0.8, Math.max(1.5, fs * 0.016));
      ctx.fillRect(-bw * 0.4, bh * 0.5 + fs * 0.035, bw * 0.8, Math.max(1.5, fs * 0.016));
      var tau = t - 0.15, k = clamp((t - 0.04) / 0.11, 0, 1), sc = lerp(2.4, 1, k);
      if (tau >= 0) sc = 1 - 0.1 * Math.exp(-tau * 12) * Math.sin(tau * 32 + 1.2) + 0.03 * Math.sin(t * 9) + q * 0.06;
      ctx.globalAlpha = Math.min(1, k * 2.2) * (1 - q);
      ctx.drawImage(spr.cv, -spr.w * sc / 2, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
      ctx.globalAlpha = 1;
      drawSub(ctx, b, bh * 0.5 + fs * 0.24, Math.max(13, fs * 0.17), clamp((t - 0.2) / 0.1, 0, 1) * (1 - q), C.shu, '#fbf6e8');
    } else { // boss
      fs = fitPx(b, 0.2, 0.86); bw = W * 1.25 + fs * 0.4; bh = fs * 1.5;
      spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: C.shu, stroke: '#000', sw: fs * 0.07, shadow: '#000', sox: fs * 0.03, soy: fs * 0.05, bold: 0.02, kasure: true });
      var ein = Math.min(1, t / 0.3), en = ein * (1 - q);
      veil(ctx, '#050302', 0.75 * en);
      ctx.translate(cx, cy);
      ctx.save(); ctx.scale(1, 0.15 + 0.85 * easeOut(t / 0.35));
      ctx.globalAlpha = 0.94 * (1 - q);
      drawBand(ctx, '#0b0907', bw, bh, 1, 0);
      ctx.restore();
      ctx.fillStyle = C.shu; ctx.globalAlpha = 0.8 * en;
      var lw = bw * 0.42 * easeOut(t / 0.5), lh = Math.max(1.5, fs * 0.014);
      ctx.fillRect(-lw, -bh * 0.5 - lh * 3, lw * 2, lh); ctx.fillRect(-lw, bh * 0.5 + lh * 2, lw * 2, lh);
      var jit = U * 0.35 * (0.4 + 0.6 * Math.abs(Math.sin(t * 7)));
      var sc2 = 1.14 - 0.14 * easeOut(t / (d * 0.7));
      ctx.globalAlpha = clamp((t - 0.1) / 0.3, 0, 1) * (1 - q);
      ctx.drawImage(spr.cv, -spr.w * sc2 / 2 + (Math.random() - 0.5) * jit, -spr.h * sc2 / 2 + (Math.random() - 0.5) * jit, spr.w * sc2, spr.h * sc2);
      ctx.globalAlpha = 1;
      drawSub(ctx, b, bh * 0.5 + fs * 0.26, Math.max(13, fs * 0.18), clamp((t - 0.4) / 0.2, 0, 1) * (1 - q), '#f2ead8', '#0b0907');
    }
    ctx.restore();
  }

  // 「第三波」— 控えめな縦書き
  function drawWaveBanner(ctx, b) {
    var t = b.t, d = b.dur, n = Math.max(1, chars(b.text).length);
    var fs = Math.max(14, Math.min(H * 0.5 / n / 1.06, W * 0.17, H * 0.105));
    var spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: C.sumi, stroke: '#fbf6e8', sw: fs * 0.09, vertical: true });
    var kin = clamp(t / 0.25, 0, 1), q = clamp((t - (d - 0.3)) / 0.3, 0, 1), a = kin * (1 - q);
    var cx = W / 2, cy = H * 0.4, th = fs * 1.06 * n;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.72 * a; ctx.fillStyle = '#f6efde';
    ctx.fillRect(-fs * 0.86, -th / 2 - fs * 0.45, fs * 1.72, th + fs * 0.9);
    ctx.globalAlpha = a; ctx.fillStyle = C.shu;
    var ll = (th + fs * 0.9) * easeOut(t / 0.4), lw = Math.max(1.2, fs * 0.035);
    ctx.fillRect(-fs * 0.86, -th / 2 - fs * 0.45, lw, ll);
    ctx.fillRect(fs * 0.86 - lw, th / 2 + fs * 0.45 - ll, lw, ll);
    ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2 - (1 - easeOut(kin)) * fs * 0.4 + q * fs * 0.25, spr.w, spr.h);
    if (b.sub) {
      ctx.rotate(0);
      drawSub(ctx, b, th / 2 + fs * 1.05, Math.max(12, fs * 0.36), a, C.sumi, '#fbf6e8');
    }
    ctx.restore();
  }

  // 「一閃」— 小さく素早い
  function drawIssen(ctx, b) {
    var t = b.t, d = b.dur, fs = Math.min(fitPx(b, 0.12, 0.62), U * 15);
    var spr = bannerSprite(b, fs, { font: FONT_BRUSH, fill: C.sumi, stroke: '#fbf6e8', sw: fs * 0.11 });
    var kin = clamp(t / 0.1, 0, 1), q = clamp((t - (d - 0.18)) / 0.18, 0, 1);
    var x = lerp(-U * 34, 0, easeOut(kin)) + Math.max(0, t - 0.1) * U * 6 + q * q * U * 40;
    ctx.save();
    ctx.translate(W / 2 + x, H * (H > W ? 0.2 : 0.15)); ctx.rotate(-0.08); ctx.transform(1, 0, -0.2, 1, 0, 0);
    var a = Math.min(1, kin * 2) * (1 - q);
    var g = easeOut(t / 0.16), hw = spr.w * 0.62;
    ctx.globalAlpha = a; ctx.fillStyle = C.shu;
    lens(ctx, -hw, fs * 0.5, -hw + hw * 2 * g, fs * 0.36, fs * 0.05);
    if (t < 0.2) { ctx.globalAlpha = a * (1 - t / 0.2); ctx.fillStyle = '#fff'; lens(ctx, -hw, fs * 0.5, -hw + hw * 2 * g, fs * 0.36, fs * 0.025); ctx.globalAlpha = a; }
    var sc = 1 + 0.25 * Math.exp(-t * 16);
    ctx.drawImage(spr.cv, -spr.w * sc / 2, -spr.h * sc / 2, spr.w * sc, spr.h * sc);
    ctx.globalAlpha = 1;
    drawSub(ctx, b, fs * 0.85, Math.max(12, fs * 0.3), a, C.shu, '#fbf6e8');
    ctx.restore();
  }

  function drawBanner(ctx, b) {
    if (!b.text) return;
    if (b.style === 'ichiyanagi') drawIchiyanagi(ctx, b);
    else if (b.style === 'ichiSmall') drawIchiSmall(ctx, b);
    else if (b.style === 'wave') drawWaveBanner(ctx, b);
    else if (b.style === 'issen') drawIssen(ctx, b);
    else drawBandBanner(ctx, b);
  }

  function drawHurtText(ctx) {
    var h = hurtTxt, t = hurtT, tot = hurtDur + 0.3, q = clamp((t - (tot - 0.3)) / 0.3, 0, 1);
    var sc = t < 0.1 ? lerp(1.8, 1, easeOut(t / 0.1)) : 1 + 0.06 * Math.exp(-(t - 0.1) * 8) * Math.sin(t * 30);
    var maxW = W * 0.9, fs = h.size;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = Math.round(fs) + 'px ' + FONT_BOLD;
    var w = ctx.measureText(h.text).width; if (w > maxW) fs *= maxW / w;
    var y = h.y - Math.min(t, 0.5) * U * 3, x = clamp(h.x, fs * 2.6, W - fs * 2.6);
    ctx.globalAlpha = Math.min(1, t / 0.04) * (1 - q);
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.font = Math.round(fs) + 'px ' + FONT_BOLD;
    ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#fbf6e8'; ctx.strokeText(h.text, 0, 0);
    ctx.fillStyle = C.shu; ctx.fillText(h.text, 0, 0);
    if (h.sub) {
      var f2 = fs * 0.62; ctx.font = Math.round(f2) + 'px ' + FONT_BOLD;
      ctx.lineWidth = f2 * 0.22; ctx.strokeStyle = '#fbf6e8'; ctx.strokeText(h.sub, 0, fs * 0.95);
      ctx.fillStyle = C.sumi; ctx.fillText(h.sub, 0, fs * 0.95);
    }
    ctx.restore();
  }

  FX.drawOverlay = function (ctx) {
    if (!ctx || !ready) return;
    ctx.save();
    if (lastDanger > 0.01) veil(ctx, C.shu, lastDanger * (0.55 + 0.18 * Math.sin(clock * 5.5)));
    if (hurtAmt > 0 && hurtT < hurtDur) {   // 朱の縁取り: 危険度の常時ビネットより明確に濃く、0.9 秒ほどで消える
      var hq = 1 - hurtT / hurtDur, ha = hurtAmt * (hq * hq * 0.6 + hq * 0.4);
      veil(ctx, C.shu, Math.min(1, ha));
      veil(ctx, '#8a1a0a', Math.min(1, ha * 0.6));
    }
    if (mainBanner) drawBanner(ctx, mainBanner);
    if (minorBanner) drawBanner(ctx, minorBanner);
    if (hurtAmt > 0 && hurtTxt && hurtT < hurtDur + 0.3) drawHurtText(ctx);   // 題字より手前
    if (flashAlpha > 0 && flashDur > 0) {
      var f = 1 - flashT / flashDur;
      if (f > 0) { ctx.globalAlpha = flashAlpha * f * f; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); }
    }
    ctx.restore();
  };

  // 筆文字フォントが後から読み込まれたら文字キャッシュを作り直す
  if (typeof document !== 'undefined' && document.fonts) {
    var bump = function () { fontGen++; kanaCache = {}; kanaCount = 0; };
    try {
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', bump);
      if (document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(bump, function () { });
    } catch (err) { /* 古い環境では何もしない */ }
  }

  if (typeof window !== 'undefined') window.IchiFX = FX;
})();
