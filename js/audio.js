// いちやなぎ一閃 — 音（WebAudio 合成のみ）
(function (root) {
  'use strict';

  var ctx = null, ok = false;
  var master, dry, wet, musicBus, duck, musicRev, noiseBuf;
  var muted = false;
  var musicWanted = false, musicOn = false, timer = null;
  var hidden = false, suspendTimer = null;
  var targetI = 0.2, I = 0.2, fever = false;

  var MUSIC_LEVEL = 0.42;
  var SCALE = [0, 3, 5, 7, 10];          // 民謡音階（レ ファ ソ ラ ド）
  var ROOT = 62;                         // idx 0 = D4

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function sm(x, w) { x = clamp(x / (w || 0.15), 0, 1); return x * x * (3 - 2 * x); }
  function nf(idx) {                     // 音階インデックス → 周波数
    var o = Math.floor(idx / 5), d = idx - o * 5;
    return 440 * Math.pow(2, (ROOT + 12 * o + SCALE[d] - 69) / 12);
  }

  // ───────── 初期化 ─────────
  function build() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    var sr = ctx.sampleRate, i, c;

    // ノイズ素材
    noiseBuf = ctx.createBuffer(1, Math.floor(sr * 2), sr);
    var nd = noiseBuf.getChannelData(0);
    for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // 出力段: master(ミュート) → コンプ → リミッター → 出力
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.001; lim.release.value = 0.08;
    var out = ctx.createGain();
    out.gain.value = 0.85;
    master.connect(comp); comp.connect(lim); lim.connect(out); out.connect(ctx.destination);

    // 残響（生成インパルス）
    var rev = ctx.createConvolver();
    var n = Math.floor(sr * 1.7), ir = ctx.createBuffer(2, n, sr);
    for (c = 0; c < 2; c++) {
      var d = ir.getChannelData(c), lp = 0;
      for (i = 0; i < n; i++) {
        var k = 1 - i / n;
        lp += ((Math.random() * 2 - 1) - lp) * (0.25 + 0.6 * k);
        d[i] = lp * Math.pow(k, 2.6) * (i < 200 ? i / 200 : 1);
      }
    }
    rev.buffer = ir;
    var revRet = ctx.createGain();
    revRet.gain.value = 0.5;
    rev.connect(revRet); revRet.connect(master);

    // 効果音バス: dry は素のまま、wet は残響つき
    dry = ctx.createGain(); dry.connect(master);
    wet = ctx.createGain(); wet.connect(master);
    var wetSend = ctx.createGain(); wetSend.gain.value = 0.55;
    wet.connect(wetSend); wetSend.connect(rev);

    // BGM バス（duck は大見得のときに引っ込める用）
    musicBus = ctx.createGain(); musicBus.gain.value = 0;
    duck = ctx.createGain();
    musicBus.connect(duck); duck.connect(master);
    musicRev = ctx.createGain(); musicRev.gain.value = 0.3;
    duck.connect(musicRev); musicRev.connect(rev);
    return true;
  }

  function init() {
    try {
      if (!ctx) {
        ok = build();
        if (!ok) return;
      }
      if (ctx.state !== 'running' && !hidden && ctx.resume) {
        var p = ctx.resume();
        if (p && p.then) p.then(onRunning, function () {});
      }
      onRunning();
    } catch (e) { ok = false; }
  }
  function onRunning() {
    if (ok && musicWanted && !musicOn && !hidden && ctx.state === 'running') beginMusic();
  }
  function ready() { return ok && ctx && ctx.state === 'running'; }

  // ───────── 合成の部品 ─────────
  function envGain(t, a, h, d, g) {
    var n = ctx.createGain(), p = n.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(g, t + a);
    if (h > 0) p.setValueAtTime(g, t + a + h);
    p.exponentialRampToValueAtTime(0.0001, t + a + h + d);
    return n;
  }
  function finish(src, last, t, len) {
    src.start(t);
    src.stop(t + len + 0.03);
    src.onended = function () { try { last.disconnect(); } catch (e) {} };
  }

  // 単純な発振音 {t,f,f2,gl,type,a,h,d,g,det,dest}
  function tone(o) {
    var t = o.t, a = o.a || 0.002, h = o.h || 0, d = o.d || 0.2;
    var osc = ctx.createOscillator(), g = envGain(t, a, h, d, o.g);
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.gl || (a + h + d)));
    if (o.det) osc.detune.value = o.det;
    osc.connect(g); g.connect(o.dest || dry);
    finish(osc, g, t, a + h + d);
    return osc;
  }

  // フィルタ付きノイズ {t,a,h,d,g,type,f,f2,gl,q,dest}
  function noise(o) {
    var t = o.t, a = o.a || 0.002, h = o.h || 0, d = o.d || 0.1;
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = envGain(t, a, h, d, o.g);
    src.buffer = noiseBuf; src.loop = true;
    fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + (o.gl || (a + h + d)));
    fl.Q.value = o.q || 0.8;
    src.connect(fl); fl.connect(g); g.connect(o.dest || dry);
    src.start(t, Math.random() * 1.5);
    src.stop(t + a + h + d + 0.03);
    src.onended = function () { try { g.disconnect(); } catch (e) {} };
  }

  // 撥弦（琴 / 三味線）
  function pluck(t, f, g, d, dest, bright, q, type) {
    var osc = ctx.createOscillator(), fl = ctx.createBiquadFilter(), gn = envGain(t, 0.002, 0, d, g);
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f * 1.012, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    fl.type = 'lowpass'; fl.Q.value = q || 1.2;
    fl.frequency.setValueAtTime(Math.min(f * (bright || 7), 14000), t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(f * 1.3, 200), t + d * 0.7);
    osc.connect(fl); fl.connect(gn); gn.connect(dest || dry);
    finish(osc, gn, t, d);
  }
  function koto(t, f, g, d, dest) { pluck(t, f, g, d || 0.7, dest, 8, 1.2); }
  function shami(t, f, g, d, dest) { pluck(t, f, g, d || 0.22, dest, 11, 4.5, 'square'); }

  // 太鼓
  function taiko(t, f, g, d, dest) {
    tone({ t: t, f: f * 2.4, f2: f, gl: 0.06, a: 0.001, d: d, g: g, dest: dest });
    noise({ t: t, type: 'lowpass', f: f * 9, f2: f * 3, d: 0.045, g: g * 0.55, dest: dest });
  }
  // 拍子木
  function hyoshigi(t, g, dest, pitch) {
    var p = pitch || 1;
    tone({ t: t, f: 1180 * p, type: 'triangle', a: 0.001, d: 0.11, g: g, dest: dest });
    tone({ t: t, f: 2790 * p, a: 0.001, d: 0.06, g: g * 0.6, dest: dest });
    noise({ t: t, f: 3200 * p, q: 1.5, d: 0.02, g: g * 0.8, dest: dest });
  }
  // 鉦・鈴
  function kane(t, f, g, d, dest) {
    tone({ t: t, f: f, a: 0.001, d: d, g: g, dest: dest });
    tone({ t: t, f: f * 2.76, a: 0.001, d: d * 0.6, g: g * 0.45, dest: dest });
    tone({ t: t, f: f * 5.4, a: 0.001, d: d * 0.3, g: g * 0.25, dest: dest });
  }
  // 尺八風
  function shaku(t, f, dur, g, dest, fEnd) {
    var osc = ctx.createOscillator(), gn = envGain(t, 0.09, dur * 0.55, dur * 0.45, g);
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 0.93, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.1);
    if (fEnd) osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur + 0.09);
    lfo.frequency.value = 5.2;
    lg.gain.setValueAtTime(0.0001, t);
    lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
    lfo.connect(lg); lg.connect(osc.frequency);
    osc.connect(gn); gn.connect(dest || wet);
    lfo.start(t); lfo.stop(t + dur + 0.15);
    finish(osc, gn, t, dur + 0.09);
    tone({ t: t, f: f * 2, f2: fEnd ? fEnd * 2 : 0, type: 'triangle', a: 0.1, h: dur * 0.5, d: dur * 0.4, g: g * 0.12, dest: dest || wet });
    noise({ t: t, f: f * 2, q: 2.5, a: 0.03, h: dur * 0.3, d: dur * 0.6, g: g * 0.5, dest: dest || wet });
  }
  // 掛け声風（2 フォルマント）
  function voice(t, f0, f1, dur, va, vb, g, dest) {
    var osc = ctx.createOscillator(), gn = envGain(t, 0.015, dur * 0.5, dur * 0.5, g), i;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    for (i = 0; i < 2; i++) {
      var b = ctx.createBiquadFilter();
      b.type = 'bandpass'; b.Q.value = 7;
      b.frequency.setValueAtTime(va[i], t);
      b.frequency.exponentialRampToValueAtTime(vb[i], t + dur * 0.7);
      osc.connect(b); b.connect(gn);
    }
    gn.connect(dest || dry);
    finish(osc, gn, t, dur + 0.02);
  }
  function duckMusic(t, depth, dur) {
    var p = duck.gain;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(depth, t, 0.02);
    p.setTargetAtTime(1, t + dur, 0.35);
  }

  // ───────── 発音数制限 ─────────
  // gap: 最短間隔(秒) / max: 同時発音数 / len: 1 発の目安長 / lo: 混雑時に捨ててよい
  var LIM = {
    slash: { gap: 0.045, max: 3, len: 0.2, lo: 1 },
    hit: { gap: 0, max: 12, len: 0.45 },
    ichiyanagi: { gap: 0.35, max: 2, len: 2.2 },
    issen: { gap: 0.08, max: 3, len: 0.8 },
    teppei: { gap: 0.3, max: 2, len: 1.0 },
    teppeiOuch: { gap: 0.15, max: 2, len: 0.8 },
    teppeiFly: { gap: 0.3, max: 1, len: 0.9 },
    damage: { gap: 0.1, max: 3, len: 1.0 },
    bossAppear: { gap: 0.5, max: 1, len: 2.4 },
    bossHit: { gap: 0.06, max: 4, len: 0.35 },
    bossDown: { gap: 0.5, max: 1, len: 2.6 },
    wave: { gap: 0.15, max: 2, len: 0.5 },
    start: { gap: 0.3, max: 1, len: 1.2 },
    gameover: { gap: 0.5, max: 1, len: 3.0 },
    ui: { gap: 0.04, max: 3, len: 0.15, lo: 1 },
    fever: { gap: 0.4, max: 1, len: 1.6 },
    clang: { gap: 0.08, max: 3, len: 0.7 },
    chargeReady: { gap: 0.2, max: 1, len: 0.6 },
    power: { gap: 0.2, max: 1, len: 0.6 },
    seal: { gap: 0.2, max: 2, len: 1.3 },
    puff: { gap: 0.06, max: 3, len: 0.25, lo: 1 },
    roar: { gap: 0.5, max: 1, len: 1.5 },
    aim: { gap: 0.1, max: 3, len: 0.35 },
    kanaLost: { gap: 0.3, max: 1, len: 0.6, lo: 1 },
    bell: { gap: 0.12, max: 2, len: 1.0 },
    bellEmpty: { gap: 0.1, max: 2, len: 0.2, lo: 1 }
  };
  var vs = {}, allEnds = [], hitNext = 0;
  function prune(a, t) {
    var j = 0, i;
    for (i = 0; i < a.length; i++) if (a[i] > t) a[j++] = a[i];
    a.length = j;
  }
  function allow(name, t) {
    var L = LIM[name], s = vs[name] || (vs[name] = { last: -9, ends: [] });
    prune(s.ends, t); prune(allEnds, t);
    if (t - s.last < L.gap || s.ends.length >= L.max) return false;
    if (L.lo && allEnds.length > 14) return false;
    s.last = t; s.ends.push(t + L.len); allEnds.push(t + L.len);
    return true;
  }

  // ───────── 効果音 ─────────
  var S = {};

  S.slash = function (t, o) {
    var p = clamp(num(o.power, 0.5), 0, 1), v = rnd(0.85, 1.18);
    noise({ t: t, f: (700 + 500 * p) * v, f2: (2600 + 2600 * p) * v, q: 1.1,
      a: 0.012, d: 0.09 + 0.07 * p, g: 0.09 + 0.13 * p });
    if (p > 0.6) noise({ t: t + 0.01, type: 'highpass', f: 5000, d: 0.07, g: 0.05 * p });
  };

  S.hit = function (t, o) {
    var step = clamp(Math.round(num(o.step, 0)), 0, 4);
    var k = clamp(num(o.combo, 0) / 20, 0, 1);
    var busy = vs.hit.ends.length > 5;
    var f = nf(5 + step), g = 0.26 + 0.035 * step;
    // 斬った手応え
    noise({ t: t, type: 'highpass', f: 5200, f2: 1700, d: 0.06, g: 0.2 });
    if (!busy) taiko(t, 78 + step * 5, 0.42, 0.13);
    // 音階
    koto(t, f, g, 0.5 + 0.06 * step, wet);
    tone({ t: t, f: f * 2, a: 0.001, d: 0.3, g: g * 0.3, dest: wet });
    if (step === 4) {
      koto(t + 0.012, f * 2, g * 0.5, 0.6, wet);
      hyoshigi(t, 0.12, wet, 1.2);
    }
    // コンボの華やかさ
    if (k > 0.2 && !busy) {
      koto(t + 0.028, nf(8 + step), g * 0.4 * k, 0.4, wet);
      if (k > 0.6) kane(t + 0.02, f * 4, 0.05 * k, 0.35, wet);
    }
  };

  // 通常の一柳: 短く控えめ（ドン + 短い駆け上がり + 小さな決め）。節目の大は下
  S.ichiyanagiSmall = function (t) {
    var i, run = [7, 9, 10, 12];
    duckMusic(t, 0.6, 0.5);
    taiko(t, 58, 0.5, 0.35, wet);
    hyoshigi(t, 0.16, wet);
    for (i = 0; i < run.length; i++)
      koto(t + 0.03 + i * 0.05, nf(run[i]), 0.13 + i * 0.015, 0.45, wet);
    noise({ t: t + 0.03, f: 800, f2: 5200, q: 1.4, a: 0.15, d: 0.06, g: 0.08, dest: wet });
    kane(t + 0.24, nf(17), 0.06, 0.4, wet);
    noise({ t: t + 0.24, type: 'highpass', f: 6000, d: 0.25, g: 0.05, dest: wet });
  };

  S.ichiyanagi = function (t, o) {
    if (!o || !o.big) { S.ichiyanagiSmall(t); return; }
    var i, run = [5, 6, 7, 8, 9, 10], tc = t + 0.42;
    duckMusic(t, 0.3, 1.5);
    // ドン！
    taiko(t, 52, 0.95, 0.75, wet);
    tone({ t: t, f: 104, f2: 49, gl: 0.3, a: 0.001, d: 0.5, g: 0.4 });
    hyoshigi(t, 0.3, wet);
    // 駆け上がり
    for (i = 0; i < run.length; i++) {
      koto(t + 0.05 + i * 0.058, nf(run[i]), 0.2 + i * 0.022, 0.6, wet);
      koto(t + 0.05 + i * 0.058, nf(run[i] + 5), 0.07 + i * 0.012, 0.4, wet);
    }
    noise({ t: t + 0.05, f: 500, f2: 5200, q: 1.4, a: 0.3, d: 0.1, g: 0.16, dest: wet });
    // 決め
    taiko(tc, 46, 1.0, 1.1, wet);
    hyoshigi(tc, 0.34, wet);
    var chord = [0, 3, 5, 8, 10, 13, 15];
    for (i = 0; i < chord.length; i++)
      koto(tc + i * 0.011, nf(chord[i]), 0.2, 1.5, wet);
    tone({ t: tc, f: nf(5), type: 'sawtooth', a: 0.05, h: 0.35, d: 0.9, g: 0.06, det: -7, dest: wet });
    tone({ t: tc, f: nf(8), type: 'sawtooth', a: 0.05, h: 0.35, d: 0.9, g: 0.05, det: 6, dest: wet });
    tone({ t: tc, f: nf(10), type: 'triangle', a: 0.04, h: 0.4, d: 1.0, g: 0.09, dest: wet });
    noise({ t: tc, type: 'highpass', f: 6000, d: 0.5, g: 0.1, dest: wet });
    // 余韻のきらめき
    var sp = [15, 18, 20, 17, 20, 23, 20, 25];
    for (i = 0; i < sp.length; i++)
      kane(tc + 0.14 + i * 0.085, nf(sp[i]), 0.07 * (1 - i / 11), 0.7, wet);
    taiko(tc + 0.62, 50, 0.3, 0.6, wet);
    shaku(tc + 0.25, nf(10), 0.9, 0.05, wet);
  };

  S.issen = function (t, o) {
    var c = clamp(num(o.count, 2), 2, 8), k = (c - 2) / 6, i;
    var ps = [1, 1.34, 1.59, 2.02, 2.41, 2.93], n = 3 + Math.round(k * 3), base = 2500 + 500 * k;
    noise({ t: t, type: 'highpass', f: 2500, f2: 8000, a: 0.03, d: 0.07, g: 0.16 + 0.08 * k });
    for (i = 0; i < n; i++)
      tone({ t: t + 0.03, f: base * ps[i] * 0.97, f2: base * ps[i], gl: 0.08, a: 0.004,
        d: 0.75 - i * 0.08 + 0.3 * k, g: (0.085 + 0.03 * k) / (1 + i * 0.5), dest: wet });
    noise({ t: t + 0.03, type: 'highpass', f: 7500, d: 0.35, g: 0.05 + 0.04 * k, dest: wet });
    if (c >= 4) koto(t + 0.03, nf(15), 0.12, 0.5, wet);
  };

  S.teppei = function (t) {
    var i;
    duckMusic(t, 0.55, 0.8);
    // 掛け声「せいやっ」
    voice(t, 190, 215, 0.13, [500, 1800], [320, 2300], 0.5);
    voice(t + 0.14, 235, 300, 0.3, [320, 2300], [850, 1250], 0.65, wet);
    // 疾走
    noise({ t: t + 0.1, f: 300, f2: 2600, q: 0.9, a: 0.25, d: 0.5, g: 0.26 });
    for (i = 0; i < 9; i++)
      taiko(t + 0.12 + i * 0.075 - i * i * 0.0022, 150 + i * 6, 0.16 + i * 0.012, 0.07);
    for (i = 0; i < 5; i++) shami(t + 0.16 + i * 0.07, nf(5 + i), 0.13, 0.2, wet);
    taiko(t + 0.72, 60, 0.6, 0.4, wet);
  };

  S.teppeiOuch = function (t) {
    hyoshigi(t, 0.2, dry, 0.55);
    var osc = tone({ t: t + 0.03, f: 620, f2: 170, type: 'triangle', a: 0.01, h: 0.1, d: 0.4, g: 0.26 });
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 11; lg.gain.value = 38;
    lfo.connect(lg); lg.connect(osc.frequency);
    lfo.start(t); lfo.stop(t + 0.6);
    // しょんぼり
    shami(t + 0.5, nf(1), 0.2, 0.25);
    tone({ t: t + 0.68, f: nf(0), f2: nf(0) * 0.9, type: 'triangle', a: 0.01, d: 0.35, g: 0.2 });
  };

  // 鈴で哲平が吹っ飛ぶ: コミカルなヒュ〜ン（上昇するホイッスル + 小さな揺れ）と、最後の小さなキラッ
  S.teppeiFly = function (t) {
    var osc = tone({ t: t, f: 330, f2: 1500, type: 'sine', a: 0.01, h: 0.35, d: 0.45, g: 0.2 });
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 18; lg.gain.value = 40;
    lfo.connect(lg); lg.connect(osc.frequency);
    lfo.start(t); lfo.stop(t + 0.9);
    tone({ t: t + 0.05, f: 660, f2: 3000, type: 'triangle', a: 0.01, h: 0.3, d: 0.4, g: 0.05, dest: wet });
    tone({ t: t + 0.7, f: 2400, a: 0.001, d: 0.2, g: 0.06, dest: wet });
  };

  // 被弾: 低い打撃 + 木が裂けるノイズ + 下降音。BGM を 0.5 秒絞る。残り 1 なら警告音を重ねる
  S.damage = function (t, o) {
    var deep = !!o.deep, i;
    duckMusic(t, 0.18, 0.5);
    // 低い打撃（重く長く）
    taiko(t, 40, 1.0, 0.6);
    tone({ t: t, f: 120, f2: 38, gl: 0.25, a: 0.001, d: 0.55, g: 0.55 });
    // 木が裂ける: 鋭い破裂 + ざらついた中域ノイズ + ひび割れの短いパルス
    noise({ t: t, type: 'bandpass', f: 2600, f2: 500, q: 0.9, a: 0.002, d: 0.22, g: 0.5 });
    noise({ t: t, type: 'lowpass', f: 900, f2: 120, d: 0.45, g: 0.5 });
    for (i = 0; i < (deep ? 5 : 3); i++)
      noise({ t: t + 0.05 + i * 0.045, type: 'bandpass', f: 1500 + i * 450, q: 2.2, a: 0.001, d: 0.035, g: 0.28 });
    // 短い下降音
    tone({ t: t + 0.04, f: 440, f2: 70, gl: 0.45, type: 'sawtooth', a: 0.005, h: 0.05, d: 0.4, g: 0.2 });
    tone({ t: t + 0.04, f: 330, f2: 52, gl: 0.45, type: 'square', a: 0.005, h: 0.05, d: 0.4, g: 0.1, det: 12 });
    pluck(t, 73.4, 0.22, 0.45, dry, 5, 2);
    pluck(t, 77.8, 0.2, 0.45, dry, 5, 2);
    if (deep) taiko(t + 0.14, 36, 0.8, 0.5);
    // 残り 1: 警告音（二度鳴る高めの音）
    if (o.left === 1) {
      for (i = 0; i < 2; i++) {
        tone({ t: t + 0.5 + i * 0.18, f: 880, f2: 740, gl: 0.12, type: 'square', a: 0.004, h: 0.05, d: 0.08, g: 0.16 });
        tone({ t: t + 0.5 + i * 0.18, f: 1320, a: 0.004, d: 0.1, g: 0.08, dest: wet });
      }
    }
  };

  S.bossAppear = function (t) {
    var i, tt = t;
    duckMusic(t, 0.25, 2.2);
    pluck(t, 36.7, 0.3, 2.3, wet, 3, 3);
    tone({ t: t, f: 37.2, type: 'sawtooth', a: 0.6, h: 0.8, d: 0.9, g: 0.1, dest: wet });
    tone({ t: t, f: 51.9, type: 'sine', a: 0.6, h: 0.8, d: 0.9, g: 0.22 });
    // 加速する太鼓
    var gap = 0.34;
    for (i = 0; i < 11; i++) {
      taiko(tt, 58, 0.3 + i * 0.045, 0.25, wet);
      tt += gap; gap = Math.max(0.07, gap * 0.8);
    }
    taiko(tt + 0.05, 42, 1.0, 1.0, wet);
    noise({ t: tt + 0.05, type: 'lowpass', f: 900, f2: 100, d: 0.8, g: 0.35, dest: wet });
    shaku(t + 0.3, 415, 1.3, 0.13, wet, 300);
  };

  S.bossHit = function (t) {
    var v = rnd(0.9, 1.12);
    taiko(t, 62 * v, 0.7, 0.22);
    noise({ t: t, type: 'highpass', f: 3500, d: 0.05, g: 0.2 });
    tone({ t: t, f: 523 * v, type: 'square', a: 0.001, d: 0.09, g: 0.06 });
    tone({ t: t, f: 1396 * v, a: 0.001, d: 0.16, g: 0.07, dest: wet });
  };

  S.bossDown = function (t) {
    var i, tc = t + 0.95;
    duckMusic(t, 0.25, 2.2);
    for (i = 0; i < 3; i++) {
      taiko(t + i * 0.26, 60 - i * 8, 0.85, 0.5, wet);
      noise({ t: t + i * 0.26, type: 'lowpass', f: 2400, f2: 150, d: 0.5, g: 0.35, dest: wet });
    }
    tone({ t: t, f: 320, f2: 40, type: 'sawtooth', a: 0.02, d: 0.9, g: 0.12 });
    for (i = 0; i < 11; i++) koto(t + 0.5 + i * 0.04, nf(i + 2), 0.12 + i * 0.012, 0.5, wet);
    taiko(tc, 46, 1.0, 1.2, wet);
    hyoshigi(tc, 0.3, wet);
    var chord = [0, 3, 5, 8, 10, 12, 15];
    for (i = 0; i < chord.length; i++) koto(tc + i * 0.014, nf(chord[i]), 0.2, 1.6, wet);
    for (i = 0; i < 7; i++) kane(tc + 0.15 + i * 0.1, nf(pick([15, 17, 18, 20, 22])), 0.06 * (1 - i / 9), 0.7, wet);
    shaku(tc + 0.1, nf(8), 1.1, 0.07, wet, nf(10));
  };

  S.wave = function (t) {
    hyoshigi(t, 0.1, wet, 0.97);
    hyoshigi(t + 0.022, 0.5, wet);
    noise({ t: t + 0.022, type: 'highpass', f: 2000, d: 0.03, g: 0.2 });
  };

  S.start = function (t) {
    var i;
    hyoshigi(t, 0.4, wet);
    taiko(t, 55, 0.8, 0.6, wet);
    for (i = 0; i < 8; i++) koto(t + 0.08 + i * 0.045, nf(i + 3), 0.13 + i * 0.012, 0.6, wet);
    koto(t + 0.46, nf(10), 0.24, 1.0, wet);
    koto(t + 0.47, nf(5), 0.18, 1.0, wet);
    taiko(t + 0.46, 50, 0.7, 0.7, wet);
    shaku(t + 0.5, nf(8), 0.6, 0.06, wet);
  };

  S.gameover = function (t) {
    var seq = [10, 9, 8, 7, 6, 5], i;
    duckMusic(t, 0.15, 2.6);
    taiko(t, 44, 0.7, 1.0, wet);
    for (i = 0; i < seq.length; i++)
      koto(t + 0.1 + i * 0.3 + i * i * 0.018, nf(seq[i]), 0.24 - i * 0.012, 1.2, wet);
    shaku(t + 0.5, nf(5), 1.9, 0.11, wet, nf(3));
    taiko(t + 2.1, 40, 0.45, 1.0, wet);
    koto(t + 2.1, nf(0), 0.2, 1.6, wet);
    koto(t + 2.12, nf(-5), 0.2, 1.6, wet);
  };

  S.ui = function (t) {
    hyoshigi(t, 0.1, dry, 1.35);
    koto(t, nf(13), 0.07, 0.15);
  };

  S.fever = function (t) {
    var i;
    duckMusic(t, 0.45, 1.0);
    for (i = 0; i < 12; i++) taiko(t + i * 0.045, 120 + i * 5, 0.14 + i * 0.03, 0.08);
    for (i = 0; i < 13; i++) koto(t + i * 0.04, nf(3 + i), 0.1 + i * 0.01, 0.5, wet);
    noise({ t: t, f: 400, f2: 7000, q: 1.2, a: 0.5, d: 0.12, g: 0.15, dest: wet });
    var tc = t + 0.56;
    taiko(tc, 48, 1.0, 0.9, wet);
    for (i = 0; i < 4; i++) kane(tc + i * 0.11, i % 2 ? 2637 : 2093, 0.13, 0.3, wet);
    koto(tc, nf(10), 0.2, 1.2, wet); koto(tc, nf(13), 0.18, 1.2, wet); koto(tc, nf(15), 0.18, 1.2, wet);
  };

  // 盾に弾かれる金属音
  S.clang = function (t) {
    var v = rnd(0.94, 1.08);
    noise({ t: t, type: 'highpass', f: 4200, d: 0.05, g: 0.25 });
    tone({ t: t, f: 1480 * v, type: 'square', a: 0.001, d: 0.08, g: 0.07 });
    tone({ t: t, f: 920 * v, a: 0.001, d: 0.5, g: 0.2, dest: wet });
    tone({ t: t, f: 920 * v * 2.76, a: 0.001, d: 0.3, g: 0.12, dest: wet });
    tone({ t: t, f: 920 * v * 5.4, a: 0.001, d: 0.15, g: 0.07, dest: wet });
  };

  // 溜め完了
  S.chargeReady = function (t) {
    kane(t, 1568, 0.16, 0.5, wet);
    tone({ t: t + 0.05, f: 2349, a: 0.002, d: 0.4, g: 0.1, dest: wet });
    tone({ t: t, f: 392, f2: 784, gl: 0.12, type: 'triangle', a: 0.01, d: 0.2, g: 0.1 });
  };

  // 剛筆の重い風切り
  S.power = function (t) {
    noise({ t: t, f: 260, f2: 1800, q: 1.0, a: 0.04, d: 0.3, g: 0.34 });
    noise({ t: t, type: 'lowpass', f: 700, f2: 120, d: 0.3, g: 0.28 });
    taiko(t, 70, 0.5, 0.25);
    tone({ t: t, f: 180, f2: 70, type: 'sawtooth', a: 0.01, d: 0.3, g: 0.06 });
  };

  // 円封: 低い太鼓 + 鈴の上昇
  S.seal = function (t, o) {
    var c = clamp(num(o.count, 1), 1, 8), k = (c - 1) / 7, n = 3 + Math.round(k * 4), i;
    duckMusic(t, 0.5, 0.6);
    taiko(t, 58, 0.8, 0.5, wet);
    noise({ t: t, type: 'lowpass', f: 900, f2: 120, d: 0.3, g: 0.2 });
    for (i = 0; i < n; i++) kane(t + 0.08 + i * 0.07, nf(10 + i * 2), 0.11 + 0.02 * k, 0.6, wet);
    hyoshigi(t + 0.08, 0.22, wet, 1.1);
    if (c >= 2) { taiko(t + 0.3, 46, 0.7 + 0.2 * k, 0.8, wet); koto(t + 0.3, nf(15), 0.16, 0.9, wet); }
    if (c >= 4) noise({ t: t + 0.1, type: 'highpass', f: 6000, d: 0.5, g: 0.09, dest: wet });
  };

  // 煙の空振り
  S.puff = function (t) {
    noise({ t: t, type: 'bandpass', f: 500, f2: 250, q: 0.6, a: 0.03, d: 0.16, g: 0.09 });
  };

  // 大入道の咆哮
  S.roar = function (t) {
    var osc = tone({ t: t, f: 78, f2: 52, type: 'sawtooth', a: 0.12, h: 0.7, d: 0.6, g: 0.16 });
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 17; lg.gain.value = 9;
    lfo.connect(lg); lg.connect(osc.frequency);
    lfo.start(t); lfo.stop(t + 1.5);
    duckMusic(t, 0.35, 1.2);
    tone({ t: t, f: 39, type: 'sine', a: 0.1, h: 0.7, d: 0.6, g: 0.3 });
    noise({ t: t, type: 'lowpass', f: 500, f2: 150, q: 0.7, a: 0.1, h: 0.6, d: 0.7, g: 0.28, dest: wet });
    taiko(t, 44, 0.8, 0.7, wet);
  };

  // 突進の予兆
  S.aim = function (t) {
    tone({ t: t, f: 520, f2: 1320, gl: 0.22, type: 'triangle', a: 0.01, d: 0.26, g: 0.14 });
    tone({ t: t, f: 780, f2: 1980, gl: 0.22, a: 0.01, d: 0.22, g: 0.05, dest: wet });
    noise({ t: t, type: 'highpass', f: 2500, f2: 6000, d: 0.2, g: 0.06 });
  };

  // 五文字が途切れた: 控えめな下降音
  S.kanaLost = function (t) {
    tone({ t: t, f: 520, f2: 330, gl: 0.3, type: 'triangle', a: 0.01, d: 0.32, g: 0.1 });
    tone({ t: t + 0.04, f: 780, f2: 495, gl: 0.3, a: 0.01, d: 0.28, g: 0.035, dest: wet });
  };

  // 鈴: 澄んだ金属の倍音を 2 回（チリン、チリン）
  S.bell = function (t) {
    var i, tt, f;
    for (i = 0; i < 2; i++) {
      tt = t + i * 0.13; f = i ? 3136 : 2637;
      tone({ t: tt, f: f, a: 0.001, d: 0.55 - i * 0.1, g: 0.16 - i * 0.03, dest: wet });
      tone({ t: tt, f: f * 2.76, a: 0.001, d: 0.3, g: 0.07, dest: wet });
      tone({ t: tt, f: f * 5.4, a: 0.001, d: 0.12, g: 0.03, dest: wet });
      tone({ t: tt, f: f * 0.5, a: 0.001, d: 0.2, g: 0.06 });
    }
  };

  // 鈴の空振り（クールダウン中）: ごく小さい鈍い音
  S.bellEmpty = function (t) {
    tone({ t: t, f: 210, f2: 150, type: 'triangle', a: 0.002, d: 0.07, g: 0.05 });
    noise({ t: t, type: 'lowpass', f: 600, f2: 200, d: 0.05, g: 0.04 });
  };

  function sfx(name, opts) {
    try {
      if (!ready() || hidden) return;
      if (typeof name !== 'string' || !LIM.hasOwnProperty(name) || !S.hasOwnProperty(name)) return;
      var t = ctx.currentTime + 0.004, o = opts || {};
      if (name === 'hit') {
        // 同時の斬撃は少しずつずらして駆け上がりにする
        if (hitNext > t) {
          if (hitNext - t > 0.3) return;
          t = hitNext;
        }
        if (!allow(name, t)) return;
        hitNext = t + 0.05;
      } else {
        if (!allow(name, ctx.currentTime)) return;
        if (name === 'ichiyanagi' && hitNext > t && hitNext - t < 0.4) t = hitNext + 0.02;
      }
      S[name](t, o);
    } catch (e) {}
  }

  // ───────── BGM ─────────
  var RHY = [
    'x...x.x.x...x.x.', 'x.x.x...x.xxx...', 'x..x..x.x...x.x.',
    'x.xxx.x.x..x....', 'x...x.xxx.x.x...', '..x.x.x.x..x.x..', 'x.....x.x.x...x.'
  ];
  var PROG = [[0, 0, 3, 0], [0, -1, 0, 0], [0, 2, 3, 0], [0, 0, -2, -1], [0, 3, 2, 0]];
  var OST = [
    [0, null, 0, 3, null, 0, 5, 3],
    [0, 0, null, 5, 0, null, 3, 4],
    [0, 3, 5, 3, 0, 3, 5, 7]
  ];
  var ODAIKO = [0, 9, 9, .72, .5, 9, .32, 9, .12, 9, .72, 9, .42, 9, .6, .86];
  var SHIME = [9, 9, .5, 9, .28, 9, .5, .8, 9, 9, .5, .9, .28, 9, .5, .66];
  var KANE = [.7, 9, 9, 9, .7, 9, .7, .7, 9, 9, .7, 9, .7, 9, .7, .7];
  var M = { step: 0, bar: 0, next: 0, motif: null, mel: null, prog: PROG[0], ost: OST[0], shift: 1, arp: 0, flute: -1 };

  function walk(idx) {
    idx += pick([-2, -1, -1, 1, 1, 2, 0]);
    if (idx > 13) idx -= 3;
    if (idx < 4) idx += 2;
    return idx;
  }
  function genMotif() {
    var r = pick(RHY), m = [], idx = 5 + pick([0, 2, 3, 5]), i;
    for (i = 0; i < 16; i++) {
      if (r.charAt(i) === 'x') { m[i] = idx; idx = walk(idx); } else m[i] = null;
    }
    return m;
  }
  function planBar() {
    var b = M.bar % 4, i, idx, m;
    if (b === 0) {
      if (!M.motif || M.bar % 8 === 0) M.motif = genMotif();
      M.prog = pick(PROG);
      M.ost = I > 0.7 ? pick(OST) : OST[(Math.random() * 2) | 0];
      M.shift = pick([1, 2, -1, 3]);
      M.flute = (I < 0.75 && Math.random() < 0.6) ? pick([0, 2]) : -1;
    }
    m = M.motif.slice();
    if (b === 1) {
      idx = 7;
      for (i = 0; i < 8; i++) if (m[i] != null) idx = m[i];
      var r = pick(RHY);
      for (i = 8; i < 16; i++) {
        if (r.charAt(i) === 'x') { idx = walk(idx); m[i] = idx; } else m[i] = null;
      }
    } else if (b === 2) {
      for (i = 0; i < 16; i++) if (m[i] != null) m[i] += M.shift;
    } else if (b === 3) {
      var end = Math.random() < 0.5 ? 5 : 10;
      for (i = 8; i < 16; i++) m[i] = null;
      m[8] = end + 2; m[10] = end + 1; m[12] = end;
    }
    M.mel = m;
    M.arp = (Math.random() * 3) | 0;
  }

  function schedStep(s, t) {
    var b = M.bar % 4, v, g, n;
    var sd = stepDur(), hi = fever ? Math.max(I, 0.85) : I;
    t += rnd(0, 0.004);

    // 琴の旋律
    n = M.mel[s];
    if (n != null && !(I < 0.22 && (s & 3) === 2 && Math.random() < 0.6)) {
      koto(t, nf(n), 0.15 * rnd(0.8, 1.05), 0.75, musicBus);
      v = sm(hi - 0.72);
      if (v > 0) koto(t, nf(n + 5), 0.06 * v, 0.5, musicBus);
    }
    // 大太鼓
    v = sm(I - ODAIKO[s] + 0.08);
    if (v > 0) taiko(t, s === 0 ? 55 : 62, (s === 0 ? 0.5 : 0.36) * v * (0.6 + 0.4 * I), 0.3, musicBus);
    // 締太鼓
    v = sm(I - SHIME[s] + 0.08);
    if (b === 3 && s >= 12) v = Math.max(v, sm(I - 0.35));
    if (v > 0) taiko(t, 205, 0.15 * v * rnd(0.75, 1.05), 0.07, musicBus);
    // 縁打ち
    v = sm(I - 0.3);
    if (v > 0 && (s === 4 || s === 12)) hyoshigi(t, 0.045 * v, musicBus, 0.8);
    // 三味線の低音
    v = sm(I - 0.36);
    if (v > 0 && (s & 1) === 0) {
      n = M.ost[s >> 1];
      if (n != null) shami(t, nf(M.prog[b] + n - 5), 0.12 * v, 0.24, musicBus);
    }
    // 鉦
    v = sm(hi - KANE[s] + 0.05);
    if (v > 0) kane(t, s % 4 === 0 ? 2093 : 2637, 0.022 * v, 0.14, musicBus);
    // 高音の分散
    v = sm(hi - 0.8);
    if (v > 0 && M.mel[s] == null) {
      var ar = [[10, 12, 13, 12], [10, 13, 15, 13], [12, 10, 13, 15]][M.arp];
      koto(t, nf(M.prog[b] + ar[s & 3]), 0.05 * v, 0.3, musicBus);
    }
    // 尺八
    if (s === 0 && b === M.flute) shaku(t, nf(pick([5, 8, 10])), sd * 12, 0.045, musicBus);
  }

  function stepDur() { return 60 / (92 + 26 * I + (fever ? 8 : 0)) / 4; }

  function tick() {
    try {
      if (!musicOn || !ready()) return;
      var now = ctx.currentTime;
      if (M.next < now - 0.25) M.next = now + 0.05;
      while (M.next < now + 0.2) {
        I += (targetI - I) * 0.07;
        if (M.step === 0) planBar();
        schedStep(M.step, M.next);
        M.next += stepDur();
        if (++M.step >= 16) { M.step = 0; M.bar++; }
      }
    } catch (e) {}
  }

  function beginMusic() {
    if (musicOn) return;
    musicOn = true;
    var t = ctx.currentTime;
    M.step = 0; M.next = t + 0.08;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t, 0.25);
    if (timer == null) timer = setInterval(tick, 40);
    tick();
  }
  function haltMusic() {
    musicOn = false;
    if (timer != null) { clearInterval(timer); timer = null; }
    if (ok && ctx) {
      var t = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setTargetAtTime(0, t, 0.08);
    }
  }
  function startMusic() {
    musicWanted = true;
    try { if (ready() && !hidden) beginMusic(); } catch (e) {}
  }
  function stopMusic() {
    musicWanted = false;
    try { haltMusic(); } catch (e) {}
  }

  function setIntensity(v) { targetI = clamp(num(v, targetI), 0, 1); }
  function setFever(b) { fever = !!b; }

  function setMuted(b) {
    muted = !!b;
    try {
      if (ok && ctx) {
        var t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02);
      }
    } catch (e) {}
  }
  function isMuted() { return muted; }

  // タブ非表示で BGM と AudioContext を休ませる
  function onVis() {
    try {
      hidden = !!root.document.hidden;
      if (!ok || !ctx) return;
      if (hidden) {
        haltMusic();
        if (suspendTimer == null) suspendTimer = setTimeout(function () {
          suspendTimer = null;
          try { if (hidden && ctx.suspend) ctx.suspend(); } catch (e) {}
        }, 350);
      } else {
        if (suspendTimer != null) { clearTimeout(suspendTimer); suspendTimer = null; }
        init();
      }
    } catch (e) {}
  }
  if (root.document && root.document.addEventListener)
    root.document.addEventListener('visibilitychange', onVis);

  root.IchiAudio = {
    init: init,
    setMuted: setMuted,
    isMuted: isMuted,
    startMusic: startMusic,
    stopMusic: stopMusic,
    setIntensity: setIntensity,
    setFever: setFever,
    sfx: sfx
  };
})(typeof window !== 'undefined' ? window : this);
