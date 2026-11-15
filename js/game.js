// いちやなぎ一閃 — ゲーム本体（入力・進行・HUD）
(function () {
  'use strict';

  // ===================== 調整値 =====================
  // 大きさ・速さは U（= 画面短辺 / 100）基準
  var CFG = {
    DPR_MAX: 2,
    DT_MAX: 0.05,

    // 柳
    WILLOW_X: 0.5,            // 画面幅に対する位置
    WILLOW_Y: 0.62,           // 木の中心の高さ（画面高に対する割合）
    WILLOW_SIZE: 34,          // 木の大きさ (U)。FX は (x,y) を中心に描く
    WILLOW_CORE_UP: 0.04,     // 木の中心から当たり中心までの上ずらし（size 比）
    WILLOW_CORE_R: 6,         // 当たり半径 (U)
    LIFE_MAX: 5,

    // 被弾（柳のライフは 5 しかないので確実に気づかせる）
    HURT_HITSTOP: 0.12,       // 止め（実時間）
    HURT_SLOW_TIME: 0.35,     // 続く短いスロー（実時間）
    HURT_SLOW_SCALE: 0.4,
    HURT_FLASH: 0.45,         // 朱フラッシュの濃さ
    HURT_FLASH_TIME: 0.3,
    HURT_EDGE: 0.85,          // 朱の縁取りの濃さ（深手は 1.0）
    HURT_EDGE_TIME: 0.9,      // 縁取りが消えるまで
    HURT_PULSE_TIME: 0.6,     // HUD の葉の列が脈打つ秒数
    HURT_INVINCIBLE: 2.0,     // 被弾後の無敵（ゲーム内時間・秒）。ゲームオーバーになる被弾では付かない
    HURT_BOUNCE: 90,          // 無敵中に触れた妖の弾き返し (U/秒)
    HURT_BOUNCE_STUN: 0.5,    // 弾かれたあと動けない秒数
    HURT_GUARD_FX_GAP: 0.2,   // 弾く演出（輪・音）の最短間隔（秒）
    HURT_VIBRATE: [80],       // navigator.vibrate（深手は下）
    HURT_VIBRATE_DEEP: [80, 40, 120],
    LIFE_WARN: 2,             // 残りがこれ以下で葉を朱で点滅 +「柳が危ない！」

    // 筆
    MIN_SLASH_SPEED: 45,      // これ未満の筆速 (U/秒) では斬れない
    BLADE_PAD: 1.2,           // 筆の太さぶんの当たり余裕 (U)
    TRAIL_LIFE: 0.22,         // 軌跡の残る秒数
    TRAIL_WIDTH: 2.4,
    HIT_COOLDOWN: 0.16,       // 同じ妖に連続で当たるまでの間隔
    STROKE_IDLE: 0.45,        // 斬りが途切れたら 1 筆を締める秒数（マウスは静止がこれ続いても締める）
    START_STROKE_LEN: 10,     // 開始・再挑戦に必要な筆の長さ (U)

    // 文字進行と「一柳！」
    KANA: ['い', 'ち', 'や', 'な', 'ぎ'],
    // 「一柳！」は普段は控えめ（小）、節目だけ派手（大）
    ICHI_BIG_EVERY: 5,        // 一柳のこの回数ごと（と大入道撃破）に大きい演出
    ICHI_SLOW_TIME: 0.3,      // 通常: スローモーションの実時間
    ICHI_SLOW_TIME_BIG: 0.9,  // 大
    ICHI_SLOW_SCALE: 0.25,
    ICHI_HITSTOP: 0.05,       // 通常
    ICHI_HITSTOP_BIG: 0.1,    // 大
    ICHI_FLASH: 0.18,         // 白フラッシュの濃さ（通常 / 大）
    ICHI_FLASH_BIG: 0.45,
    ICHI_SHAKE: 1.0,          // 揺れ (U)（通常 / 大）
    ICHI_SHAKE_BIG: 2.4,
    ICHI_RING_W: 1.5,         // 衝撃波の輪の線の太さ (U)（通常 / 大）
    ICHI_RING_W_BIG: 2.4,
    ICHI_LEAVES: 6,           // 葉の数（通常 / 大）
    ICHI_LEAVES_BIG: 10,
    ICHI_BLAST_R: 44,         // 衝撃波の半径 (U)。この中の妖は一掃
    ICHI_BOSS_DAMAGE: 3,      // 大入道へのダメージ
    ICHI_PUSH_R: 75,          // 一掃の外側、ここまでの生き残り（大入道以外）を吹き飛ばす (U)
    ICHI_PUSH: 110,           // 吹き飛ばしののけぞり速度 (U/秒)
    ICHI_STUN: 0.9,           // 吹き飛ばされて動けない秒数
    KANA_LOW: 0.3,            // コンボ残り時間がこの割合を切ると点いた丸が点滅
    KANA_LOST_TIME: 0.6,      // 途切れたときの丸の崩れる秒数（実時間）
    ICHI_BONUS: 500,
    MULT_MAX: 9,

    // 1 筆複数斬り
    STROKE_NAMES: { 2: '二連一閃', 3: '三連一閃', 4: '四連一閃' },
    STROKE_BONUS: 60,         // × 斬った数の二乗
    YANAGI_GIRI_COUNT: 5,
    YANAGI_GIRI_BONUS: 1500,

    // コンボ・フィーバー
    COMBO_TIME: 1.6,          // 文字が消えるまで = コンボの持続
    COMBO_STEP: 8,            // この数ごとに倍率 +0.5
    COMBO_MULT_MAX: 4,
    FEVER_COMBO: 24,
    FEVER_TIME: 9,
    FEVER_MULT: 2,

    // 哲平
    TEPPEI_GAUGE_AUTO: 3,     // 一柳 3 回で「おまかせダッシュ」（ゲージ 3 消費）
    TEPPEI_GAUGE_MAX: 5,      // 一柳 5 回で満タン = 「経路指定」（ゲージ 5 消費）
    // 経路指定: ポーズして指でなぞった道を哲平が駆ける
    PATH_TIME: 2.5,           // 描ける秒数（時間切れはそこまでの軌跡で発動。何も描かなければおまかせ）
    PATH_LEN_K: 1.3,          // 描ける長さの上限 = この値 ×（画面幅+高さ）
    PATH_SPEED_K: 1.5,        // 走る速さ = この値 × 画面長辺 / 秒
    PATH_R: 16,               // 道の太さ（斬る範囲 U）
    PATH_BOSS_CD: 0.3,        // 同じ大入道に再び当たるまでの間隔（周回で何度も斬れる）
    TEPPEI_R: 5,
    TEPPEI_WALK_SPEED: 9,
    TEPPEI_WALK_FIRST: 12,    // 最初に歩いてくるまでの秒数
    TEPPEI_WALK_MIN: 13,
    TEPPEI_WALK_MAX: 22,
    TEPPEI_OUCH_TIME: 1.3,
    TEPPEI_FLY_SPEED: 110,    // 鈴で吹っ飛ぶ初速 (U/秒)
    TEPPEI_FLY_UP: 45,        // 足す上向きの初速 (U/秒)
    TEPPEI_FLY_GRAV: 150,     // 吹っ飛び中の重力 (U/秒^2)
    TEPPEI_FLY_TIME: 0.8,     // 画面外へ出し切る目安の秒数（水平速度をこれで決める）
    TEPPEI_FLY_SPIN: 14,      // 回転 (rad/秒)
    TEPPEI_DASH_TIME: 0.85,   // 画面を横切る秒数
    TEPPEI_DASH_R: 26,        // 斬る範囲 (U)。縦長では画面高の 3 割まで広げる
    TEPPEI_DASH_R_H: 0.3,
    TEPPEI_BOSS_DAMAGE: 4,

    // 波
    WAVE_FIRST_DELAY: 0.9,
    WAVE_GAP: 1.2,
    WAVE_BASE_COUNT: 10,
    WAVE_COUNT_INC: 5,
    SPAWN_INTERVAL: 0.55,     // 1 群れあたりの間隔
    SPAWN_INTERVAL_DEC: 0.04,
    SPAWN_INTERVAL_MIN: 0.22,
    SPEED_WAVE1: 1.0,
    SPEED_INC: 0.11,
    SPEED_MAX: 2.8,
    MAX_ENEMIES: 60,
    HARD_WAVE: 10,            // この波以降は雑魚の接触でも柳が 2 ダメージ
    BOSS_EVERY: 5,
    BOSS_DELAY: 1.4,
    BOSS_HP: 18,
    BOSS_HP_INC: 8,
    BOSS_TOUCH_DAMAGE: 2,
    // 大入道: 斬られても怯まない。放置されると加速して突っ込んでくる
    BOSS_IDLE: 1.0,           // 最後に斬られてからこの秒数で突進に入る
    BOSS_RUSH_ACCEL: 2.0,     // 突進速度に達するまでの秒数
    BOSS_RUSH_SPEED: 14,      // 突進速度 (U/秒)
    BOSS_RAGE_HP: 0.5,        // HP 割合がこれ以下で怒り
    BOSS_RAGE_SPEED: 1.35,    // 怒り中の速度倍率
    BOSS_SUMMON_AT: [0.75, 0.5, 0.25],  // HP 割合がこれを切るたび取り巻きを呼ぶ
    BOSS_SUMMON_N: 6,         // 取り巻きの数（+2 / 討伐回数）
    BOSS_ENTRANCE_N: 8,       // 登場時に周囲から出す数（+2 / 討伐回数）
    // 大入道の咆哮: ボス以外の妖が加速する
    BOSS_ROAR_FIRST: 3,       // 登場から最初の咆哮までの秒数
    BOSS_ROAR_EVERY: 7,       // 咆哮の間隔 (秒)
    BOSS_ROAR_HASTE: 1.5,     // 咆哮で加速する秒数
    HASTE_MUL: 1.6,           // 加速中の速度倍率
    MAX_GROUP_LATE: 4,        // 第 GROUP_LATE_WAVE 波以降の群れ最大数
    GROUP_LATE_WAVE: 6,

    // 筆の新要素
    BLADE_RECOIL: 0.35,       // 盾に弾かれて斬れない秒数（実時間）
    TATE_FRONT_DOT: 0.42,     // 盾の正面とみなす内積のしきい値
    TATE_BREAK_BONUS: 200,    // 溜め斬りで盾を割った得点
    CHARGE_STILL: 1.5,        // 溜めの「留まり」とみなす範囲 (U)
    CHARGE_TIME: 0.4,         // 溜め完了までの留まり秒数（実時間）
    CHARGE_SHOW: 0.12,        // 溜めの表示を始める秒数
    POWER_TIME: 0.45,         // 剛筆が続く秒数（実時間）
    POWER_DAMAGE: 3,
    POWER_PAD: 2.5,           // 剛筆の当たり余裕の追加 (U)
    POWER_MARK_WIDTH: 2,      // 剛筆の斬り筋の太さ (U)

    // 円封（囲み斬り）
    LOOP_WINDOW: 1.0,         // 輪に使う点の寿命（実時間）
    LOOP_STEP: 1,             // 点を足す最小の動き (U)
    LOOP_MAX_PERIM: 120,      // 周長の上限 (U)
    LOOP_MIN_SIZE: 6,         // 面積の下限は (この値 U)^2
    LOOP_CD: 0.35,
    LOOP_BOSS_DAMAGE: 3,
    LOOP_BONUS: 80,           // × 封じた数の二乗 × 倍率

    // 妖の新種
    BUNSHIN_MINI_R: 3.0,      // 小分身の半径 (U)
    BUNSHIN_MINI_SPEED: 1.35,
    BUNSHIN_MINI_SCORE: 80,
    BUNSHIN_MINI_KNOCK: 60,   // 割れたときののけぞり (U/秒)
    BUNSHIN_MINI_CD: 0.25,
    TOSSHIN_APPROACH: 16,     // 縁から画面内へ進む距離 (U)
    TOSSHIN_AIM_BASE: 1.1,    // 狙いの秒数 = max(AIM_MIN, AIM_BASE - AIM_DEC * 波)
    TOSSHIN_AIM_DEC: 0.03,
    TOSSHIN_AIM_MIN: 0.7,
    TOSSHIN_RUSH_SPEED: 55,   // 突進速度 (U/秒。波の速度倍率は掛けない)
    KEMURI_SWAY: 5.5,         // 煙のゆらぎ振幅 (U)
    KEMURI_WISP_TIME: 3,      // すり抜けた煙の反応が消える速さ (毎秒)
    KEMURI_PASS_CD: 0.2,
    TATE_PARRY_CD: 0.25,
    TATE_GUARD_DECAY: 4,      // 弾いた光が消える速さ (毎秒)

    // 「静と動」の波
    SEI_EVERY: 5,
    SEI_OFFSET: 3,            // wave % SEI_EVERY === SEI_OFFSET の波
    SEI_BASE: 6,              // 数 = min(SEI_BASE + 波, SEI_MAX)
    SEI_MAX: 16,
    SEI_HOLD: 1.8,            // 動かない秒数
    SEI_APPEAR: 0.3,          // フェードインの秒数
    SEI_RX: 0.44, SEI_RX_MAX: 48,   // 楕円の横半径（画面幅比 / U の上限）
    SEI_RY: 0.4,  SEI_RY_MAX: 48,   // 縦半径（画面高比 / U の上限）
    SEI_TYPES: ['hitodama', 'karasu', 'chochin', 'kasa'],
    SEI_HASTE: 2.5,           // 明けた妖の加速秒数
    SEI_HASTE_MUL: 1.5,
    SEI_INTENSITY: 0.02,      // 静の間の BGM の盛り上がり
    SEI_DIM: 'rgba(26,22,18,0.22)',

    // ヒント表示
    TIP_TIME: 4.5,
    TIPS: {
      bunshin: '分身妖: 斬ると二つに割れる',
      tosshin: '突進妖: 朱の線が出たら、突っ込む前に斬れ',
      tate: '盾持ち: 後ろか横から斬れ（溜め斬りなら正面から割れる）',
      kemuri: '煙の妖: 斬れない。筆でぐるりと囲んで封じろ'
    },
    TIP_WAVE1: '押したまま止めて溜め、一気に振ると「溜め斬り」',
    TIP_WAVE1_PC: 'マウスを止めて溜め、一気に振ると「溜め斬り」',
    TIP_WAVE2: '妖を筆でぐるりと囲むと「円封」',
    TIP_BELL_PC: 'クリックで鈴 — 妖が寄って止まる。集めて円封で一網打尽',
    TIP_BELL_TOUCH: 'タップで鈴 — 妖が寄って止まる。集めて円封で一網打尽',

    // 鈴（クリック / タップで妖を寄せて止める）
    BELL_R: 48,               // 効く半径 (U)
    BELL_CD: 6,              // クールダウン（ゲーム内時間）
    BELL_PULL_TIME: 0.35,     // 寄せる秒数
    BELL_GATHER_R: 5,         // 寄せる先の半径の目安 (U)（実際は 3〜6U に散らす）
    BELL_STUN: 0.9,           // 寄ったあと動けない秒数
    BELL_TAP_TIME: 0.25,      // 押してから離すまでがこの秒数以内ならクリック / タップ
    BELL_TAP_MOVE: 2.5,       // その間の移動がこの距離 (U) 以内
    BELL_WILLOW_PAD: 2,       // 寄せた先が柳に触れないための余裕 (U)
    BELL_SHAKE: 0.4,          // 空振り時にアイコンが揺れる秒数

    // 妖の種類: r (U), speed (U/秒), hp, 得点, 出現する波, 出やすさ
    TYPES: {
      hitodama: { r: 4.4, speed: 9,   hp: 1, score: 100,  from: 1, w: 10 },
      karasu:   { r: 3.8, speed: 19,  hp: 1, score: 150,  from: 1, w: 4 },
      chochin:  { r: 4.6, speed: 10,  hp: 1, score: 150,  from: 1, w: 4 },
      kasa:     { r: 4.6, speed: 10,  hp: 1, score: 200,  from: 2, w: 3 },
      daruma:   { r: 5.6, speed: 6.5, hp: 2, score: 250,  from: 3, w: 3, solo: true },
      bunshin:  { r: 4.8, speed: 10,  hp: 1, score: 150,  from: 4, w: 3 },
      tosshin:  { r: 4.6, speed: 9,   hp: 1, score: 250,  from: 6, w: 3, solo: true },
      tate:     { r: 5.2, speed: 7.5, hp: 1, score: 300,  from: 7, w: 3 },
      kemuri:   { r: 5.4, speed: 6.5, hp: 1, score: 350,  from: 9, w: 2, solo: true },
      boss:     { r: 13,  speed: 2.6, hp: 12, score: 3000, from: 99, w: 0 }
    },
    DARUMA_HP3_WAVE: 7,

    // 称号（一柳の回数）
    RANKS: [
      // 「一柳！」は妖を 5 体倒すごと（斬り続けないと文字は 0 に戻る）
      [0, '柳の芽'], [7, '一柳見習い'], [20, '一柳剣士'], [40, '一柳師範'],
      [70, '一柳免許皆伝'], [110, '一柳の達人'], [160, '一柳大明神']
    ],
    BEST_KEY: 'ichiyanagi_issen_best'
  };

  // ===================== FX / 音の薄い窓口 =====================
  var FXO = window.IchiFX || {};
  var AUO = window.IchiAudio || {};
  function fx(name) {
    var f = FXO[name];
    if (typeof f === 'function') return f.apply(FXO, Array.prototype.slice.call(arguments, 1));
  }
  function au(name) {
    var f = AUO[name];
    if (typeof f === 'function') return f.apply(AUO, Array.prototype.slice.call(arguments, 1));
  }
  function sfx(name, opts) { au('sfx', name, opts || {}); }

  var FONT_BRUSH = FXO.FONT_BRUSH || '"Yuji Boku","Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP",serif';
  var FONT_BOLD = FXO.FONT_BOLD || '"Dela Gothic One","Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif';
  var COL = { washi: '#f2ead8', sumi: '#1a1612', shu: '#d7381f', gold: '#c9a227', yanagi: '#5b7f3a', ai: '#2b3a5c' };
  if (FXO.COLORS) { for (var ck in COL) { if (FXO.COLORS[ck]) COL[ck] = FXO.COLORS[ck]; } }

  // ===================== 基本 =====================
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, U = 1, DPR = 1;
  var safe = { t: 0, r: 0, b: 0, l: 0 };
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function nowSec() { return performance.now() / 1000; }

  var KAN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function kansuji(n) {
    n = Math.floor(n);
    if (n <= 0) return KAN[0];
    if (n >= 1000) return String(n);
    var s = '', h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10;
    if (h) s += (h > 1 ? KAN[h] : '') + '百';
    if (t) s += (t > 1 ? KAN[t] : '') + '十';
    if (o) s += KAN[o];
    return s;
  }

  // ===================== 状態 =====================
  var mode = 'title';         // title | play | over
  var paused = false;
  var G = null;               // プレイ中の状態
  var best = 0;
  var newBest = false;
  var gameT = 0;              // スケール後の累積時間（背景用）
  var uiT = 0;                // 実時間の累積（HUD の明滅用）
  var modeT = 0;              // 現在の画面になってからの実時間
  var hitstop = 0, slowT = 0, slowDur = 1, slowScale = 1;
  var willow = { x: 0, y: 0, size: 0, cx: 0, cy: 0, cr: 0 };
  var btn = { mute: { x: 0, y: 0, r: 0 }, pause: { x: 0, y: 0, r: 0 }, help: { x: 0, y: 0, r: 0 }, teppei: { x: 0, y: 0, r: 0 } };
  var finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var bladeLock = 0;          // 盾に弾かれて斬れない残り秒（実時間）
  var loopPts = [];           // 円封用: 現在の一筆の点列 {x,y,t}
  var lastLoopT = -9;
  var charge = { on: false, still: 0, ox: 0, oy: 0, ready: false, power: 0 };   // 溜め斬り（実時間）
  // hover: マウスを押さずに動かしている「常に筆が下りている」一筆（pointer.active も true）
  var pointer = { active: false, hover: false, ignore: false, id: -1, x: 0, y: 0, lt: 0 };
  var trail = [];
  var stroke = { kills: 0, lastKillT: 0, len: 0, giri: false };
  var lastSlashSfx = 0;
  var audioReady = false;
  var bellTap = null;         // 鈴になりうる押下 {id,x,y,t,touch,cancel}
  var lastPtr = { x: -1, y: -1 };   // 最後のポインタ位置（B キー用）

  try { best = parseInt(localStorage.getItem(CFG.BEST_KEY), 10) || 0; } catch (e) { best = 0; }

  function newGame() {
    return {
      score: 0, life: CFG.LIFE_MAX, hurt: 0, hurtPulse: 0, lostLeaves: [],
      kana: 0, kanaLost: null, slotGlow: 0, ichi: 0, ichiPulse: 0, lastIchiT: -99,
      mult: 1, combo: 0, comboTimer: 0, maxCombo: 0,
      fever: 0, feverNext: CFG.FEVER_COMBO,
      gauge: 0, dash: null, dashSeq: 0, path: null,
      walker: null, walkerTimer: CFG.TEPPEI_WALK_FIRST,
      enemies: [],
      wave: 0, waveState: 'gap', waveTimer: CFG.WAVE_FIRST_DELAY,
      toSpawn: 0, spawnTimer: 0, bossTimer: -1, bossCount: 0,
      bellCd: 0, bellShake: 0, invT: 0, invFxT: 0,
      sei: null, seen: {}, tip: null, god: false,
      time: 0
    };
  }

  // ===================== 配置 =====================
  function readSafe() {
    var el = document.getElementById('safe');
    if (!el || !window.getComputedStyle) return;
    var cs = getComputedStyle(el);
    safe.t = parseFloat(cs.paddingTop) || 0;
    safe.r = parseFloat(cs.paddingRight) || 0;
    safe.b = parseFloat(cs.paddingBottom) || 0;
    safe.l = parseFloat(cs.paddingLeft) || 0;
  }

  function layout() {
    willow.x = W * CFG.WILLOW_X;
    willow.y = H * CFG.WILLOW_Y;
    willow.size = CFG.WILLOW_SIZE * U;
    willow.cx = willow.x;
    willow.cy = willow.y - willow.size * CFG.WILLOW_CORE_UP;
    willow.cr = CFG.WILLOW_CORE_R * U;
    var pad = 3 * U, r = 4.2 * U;
    btn.mute.r = btn.pause.r = r;
    btn.mute.x = W - safe.r - pad - r;
    btn.mute.y = safe.t + pad + r;
    btn.pause.x = btn.mute.x - r * 2 - 1.5 * U;
    btn.pause.y = btn.mute.y;
    btn.help.r = r;
    btn.help.x = btn.pause.x - r * 2 - 1.5 * U;
    btn.help.y = btn.mute.y;
    btn.teppei.r = 7 * U;
    btn.teppei.x = W - safe.r - pad - btn.teppei.r;
    // キー案内の 1 行ぶんを下にあける
    btn.teppei.y = H - safe.b - pad - btn.teppei.r - (finePointer ? 3.6 * U : 0);
  }

  function resize() {
    var ow = W, oh = H;
    W = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    H = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    DPR = Math.min(CFG.DPR_MAX, window.devicePixelRatio || 1);
    U = Math.min(W, H) / 100;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    readSafe();
    layout();
    fx('resize', W, H);
    // 画面の変化に合わせて登場中のものを移す
    if (G && ow > 0 && oh > 0 && (ow !== W || oh !== H)) {
      var sx = W / ow, sy = H / oh, i, e;
      for (i = 0; i < G.enemies.length; i++) {
        e = G.enemies[i];
        e.bx *= sx; e.by *= sy; e.x *= sx; e.y *= sy;
        e.r = e.ru * U;
      }
      if (G.walker) { G.walker.x *= sx; G.walker.y *= sy; G.walker.r = CFG.TEPPEI_R * U; }
      if (G.dash) {
        G.dash.x *= sx; G.dash.y *= sy; G.dash.px *= sx; G.dash.py *= sy; G.dash.r = CFG.TEPPEI_R * 1.2 * U;
        if (G.dash.path) {
          var fr = G.dash.s / (G.dash.path.total || 1);
          G.dash.path = buildPath(scalePts(G.dash.path.pts, sx, sy));
          G.dash.s = fr * G.dash.path.total;
        }
      }
      if (G.path) {
        G.path.pts = scalePts(G.path.pts, sx, sy);
        G.path.len = buildPath(G.path.pts).total;
      }
    }
    trail.length = 0;
    loopPts.length = 0;
    bellTap = null;
    resetCharge();
  }

  // ===================== 妖 =====================
  function edgePoint(margin, frac) {
    var per = (W + H) * 2, p = (frac === undefined ? Math.random() : frac) * per;
    if (p < W) return { x: p, y: -margin, side: 0 };
    p -= W;
    if (p < H) return { x: W + margin, y: p, side: 1 };
    p -= H;
    if (p < W) return { x: p, y: H + margin, side: 2 };
    p -= W;
    return { x: -margin, y: p, side: 3 };
  }

  function makeEnemy(type, x, y, speedMul) {
    var d = CFG.TYPES[type];
    var hp = d.hp;
    if (type === 'daruma' && G.wave >= CFG.DARUMA_HP3_WAVE) hp = 3;
    if (type === 'boss') hp = CFG.BOSS_HP + CFG.BOSS_HP_INC * G.bossCount;
    var e = {
      type: type, x: x, y: y, bx: x, by: y,
      ru: d.r, r: d.r * U, rot: 0, t: rand(0, 3),
      hp: hp, maxHp: hp, flash: 0, seed: Math.random() * 1000,
      vx: 0, vy: 0, speed: d.speed * speedMul * rand(0.88, 1.12),
      kx: 0, ky: 0, stun: 0, hitCd: 0, dashHit: -1, dead: false, score: d.score,
      idle: 0, rush: 0, summoned: 0,
      haste: 0, hasteMul: 1, hold: 0,
      entered: false, wallT: 0, pull: null, bellT: 0, calm: 0
    };
    if (type === 'bunshin') e.mini = false;
    if (type === 'tosshin') { e.phase = 'approach'; e.aim = 0; e.ang = 0; e.trav = 0; e.aimT = 1; }
    if (type === 'tate') { e.face = 0; e.guard = 0; }
    if (type === 'kemuri') e.wisp = 0;
    if (type === 'boss') e.roarT = CFG.BOSS_ROAR_FIRST;
    noteSeen(type);
    return e;
  }

  function showTip(text) {
    if (G) G.tip = { text: text, t: CFG.TIP_TIME };
  }

  // そのプレイで初めて出た種類のヒント
  function noteSeen(type) {
    if (!G || !CFG.TIPS[type] || G.seen[type]) return;
    G.seen[type] = true;
    showTip(CFG.TIPS[type]);
  }

  function pickType() {
    var total = 0, k, d, list = [];
    for (k in CFG.TYPES) {
      d = CFG.TYPES[k];
      if (d.w > 0 && G.wave >= d.from) { list.push(k); total += d.w; }
    }
    var p = Math.random() * total;
    for (var i = 0; i < list.length; i++) {
      p -= CFG.TYPES[list[i]].w;
      if (p <= 0) return list[i];
    }
    return 'hitodama';
  }

  function waveSpeed() {
    if (G.wave <= 1) return CFG.SPEED_WAVE1;
    return Math.min(CFG.SPEED_MAX, 1 + CFG.SPEED_INC * (G.wave - 2));
  }

  function groupSize() {
    var r = Math.random();
    if (r < 0.45) return 1;
    if (G.wave >= CFG.GROUP_LATE_WAVE) return r < 0.65 ? 2 : (r < 0.85 ? 3 : CFG.MAX_GROUP_LATE);
    return Math.random() < 0.6 ? 2 : 3;
  }

  // 同じ方角から 1〜4 体の群れで出す（まとめて斬れる気持ちよさ）
  function spawnGroup() {
    var type = pickType();
    var n = CFG.TYPES[type].solo ? 1 : groupSize();
    n = Math.min(n, G.toSpawn);
    var m = CFG.TYPES[type].r * U;
    var p = edgePoint(m);
    var dx = willow.cx - p.x, dy = willow.cy - p.y, d = Math.hypot(dx, dy) || 1;
    var ux = dx / d, uy = dy / d, sm = waveSpeed();
    for (var i = 0; i < n; i++) {
      var back = i * m * 2.4, side = (i % 2 ? 1 : -1) * rand(0, 3) * U;
      var e = makeEnemy(type, p.x - ux * back - uy * side, p.y - uy * back + ux * side, sm);
      G.enemies.push(e);
    }
    G.toSpawn -= n;
  }

  // 画面の四方から等間隔に 1 体ずつ出す（大入道の登場・取り巻き用）
  function spawnRing(n) {
    var off = Math.random(), sm = waveSpeed(), i, type, p, e;
    for (i = 0; i < n; i++) {
      type = pickType();
      p = edgePoint(CFG.TYPES[type].r * U, (off + i / n) % 1);
      e = makeEnemy(type, p.x, p.y, sm);
      G.enemies.push(e);
    }
  }

  function spawnBoss() {
    // 上か左右から現れる
    var m = CFG.TYPES.boss.r * U, x, y, s = Math.random();
    if (s < 0.5) { x = rand(W * 0.2, W * 0.8); y = -m; }
    else if (s < 0.75) { x = -m; y = rand(H * 0.1, H * 0.4); }
    else { x = W + m; y = rand(H * 0.1, H * 0.4); }
    var e = makeEnemy('boss', x, y, 1);
    G.enemies.push(e);
    G.bossCount++;
    fx('banner', '大入道', { style: 'boss', sub: '大妖あらわる' });
    sfx('bossAppear');
    fx('shake', 2 * U, 0.5);
    spawnRing(CFG.BOSS_ENTRANCE_N + 2 * (G.bossCount - 1));
  }

  function waveIntensity() { return clamp(0.15 + G.wave * 0.09, 0, 1); }

  function startWave() {
    var i;
    // 静の途中で波が切り替わっても固まらないように
    G.sei = null;
    for (i = 0; i < G.enemies.length; i++) { G.enemies[i].hold = 0; G.enemies[i].sei = false; }
    G.wave++;
    G.waveState = 'spawn';
    G.toSpawn = CFG.WAVE_BASE_COUNT + CFG.WAVE_COUNT_INC * (G.wave - 1);
    G.spawnTimer = 0.5;
    G.bossTimer = (G.wave % CFG.BOSS_EVERY === 0) ? CFG.BOSS_DELAY : -1;
    if (G.wave % CFG.SEI_EVERY === CFG.SEI_OFFSET) {
      startSei();
    } else {
      fx('banner', '第' + kansuji(G.wave) + '波', { style: 'wave' });
      sfx('wave');
      au('setIntensity', waveIntensity());
    }
    if (G.wave === 1) showTip(finePointer ? CFG.TIP_WAVE1_PC : CFG.TIP_WAVE1);
    else if (G.wave === 2) showTip(CFG.TIP_WAVE2);
  }

  // 静: 柳を囲む楕円の上に、動かない妖を等間隔に置く
  function startSei() {
    var n = Math.min(CFG.SEI_BASE + G.wave, CFG.SEI_MAX), list = [], k, d, i, e, a, t, x, y, m;
    n = Math.min(n, G.toSpawn);
    for (k in CFG.TYPES) {
      d = CFG.TYPES[k];
      if (CFG.SEI_TYPES.indexOf(k) >= 0 && G.wave >= d.from) list.push(k);
    }
    if (!list.length) list.push('hitodama');
    var rx = Math.min(W * CFG.SEI_RX, CFG.SEI_RX_MAX * U), ry = Math.min(H * CFG.SEI_RY, CFG.SEI_RY_MAX * U);
    var off = Math.random() * TAU, sm = waveSpeed();
    for (i = 0; i < n; i++) {
      t = list[(Math.random() * list.length) | 0];
      a = off + i / n * TAU;
      m = CFG.TYPES[t].r * U + 2 * U;
      x = clamp(willow.cx + Math.cos(a) * rx, m, W - m);
      y = clamp(willow.cy + Math.sin(a) * ry, m, H - m);
      e = makeEnemy(t, x, y, sm);
      e.hold = CFG.SEI_HOLD;
      e.sei = true;
      e.appear = 0;
      G.enemies.push(e);
    }
    G.toSpawn -= n;
    G.sei = { t: CFG.SEI_HOLD };
    fx('banner', '静', { style: 'wave', sub: '…来るぞ' });
    au('setIntensity', CFG.SEI_INTENSITY);
  }

  function endSei() {
    var i, e;
    G.sei = null;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (!e.sei) continue;
      e.sei = false;
      e.hold = 0;
      e.haste = CFG.SEI_HASTE;
      e.hasteMul = CFG.SEI_HASTE_MUL;
    }
    fx('banner', '動！', { style: 'wave' });
    if (G.wave >= 3 && !G.seen.bell) {   // 初めての静が明けたら鈴のヒント
      G.seen.bell = true;
      showTip(finePointer ? CFG.TIP_BELL_PC : CFG.TIP_BELL_TOUCH);
    }
    fx('shake', 2 * U, 0.3);
    sfx('wave');
    au('setIntensity', waveIntensity());
  }

  // 大入道の咆哮: ボス以外の全妖が一時的に加速する
  function bossRoar(b) {
    var i, e;
    fx('shake', 2.5 * U, 0.5);
    fx('ring', b.x, b.y, { radius: 50 * U, color: COL.shu, width: 2.4 * U, duration: 0.7 });
    fx('popText', b.x, b.y - b.r * 1.5, '咆哮！', { size: 5 * U, color: COL.shu });
    sfx('roar');
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (e.type === 'boss' || e.dead) continue;
      e.haste = CFG.BOSS_ROAR_HASTE;
      e.hasteMul = CFG.HASTE_MUL;
    }
  }

  function updateWave(dt) {
    if (G.waveState === 'gap') {
      G.waveTimer -= dt;
      if (G.waveTimer <= 0) startWave();
      return;
    }
    if (G.bossTimer >= 0) {
      G.bossTimer -= dt;
      if (G.bossTimer < 0) spawnBoss();
    }
    if (G.sei) return;   // 静の間は新手を出さない
    if (G.toSpawn > 0) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0 && G.enemies.length < CFG.MAX_ENEMIES) {
        spawnGroup();
        var iv = Math.max(CFG.SPAWN_INTERVAL_MIN, CFG.SPAWN_INTERVAL - CFG.SPAWN_INTERVAL_DEC * (G.wave - 1));
        G.spawnTimer = iv * rand(0.7, 1.3);
      }
    } else if (G.enemies.length === 0 && G.bossTimer < 0) {
      G.waveState = 'gap';
      G.waveTimer = CFG.WAVE_GAP;
    }
  }

  function tri(v) { // -1..1 の三角波
    var f = v - Math.floor(v);
    return f < 0.5 ? f * 4 - 1 : 3 - f * 4;
  }

  function updateEnemy(e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.stun > 0) e.stun -= dt;
    if (e.haste > 0) e.haste -= dt;
    if (e.hold > 0) e.hold -= dt;
    if (e.appear !== undefined && e.appear < 1) e.appear = Math.min(1, e.appear + dt / CFG.SEI_APPEAR);
    if (e.guard > 0) e.guard = Math.max(0, e.guard - dt * CFG.TATE_GUARD_DECAY);
    if (e.wisp > 0) e.wisp = Math.max(0, e.wisp - dt * CFG.KEMURI_WISP_TIME);
    if (e.wallT > 0) e.wallT -= dt;
    // 一度画面内に入った妖は、のけぞりでは画面外に出ない
    var er = e.r;
    if (!e.entered && e.bx >= er && e.bx <= W - er && e.by >= er && e.by <= H - er) e.entered = true;
    // 鈴: 点の周りへ寄せる（寄せている間は動かない・のけぞらない）
    if (e.bellT > 0) e.bellT -= dt;
    if (e.pull) {
      var pl = e.pull, pf;
      pl.t += dt;
      pf = Math.min(1, pl.t / CFG.BELL_PULL_TIME);
      pf = 1 - (1 - pf) * (1 - pf) * (1 - pf);
      e.bx = pl.sx + (pl.tx - pl.sx) * pf; e.by = pl.sy + (pl.ty - pl.sy) * pf;
      e.kx = 0; e.ky = 0;
      if (pl.t >= CFG.BELL_PULL_TIME) { e.pull = null; e.stun = Math.max(e.stun, CFG.BELL_STUN); }
    }
    e.calm += (((e.pull || e.bellT > 0) ? 1 : 0) - e.calm) * Math.min(1, dt * 10);
    // のけぞり
    e.bx += e.kx * dt; e.by += e.ky * dt;
    var damp = Math.exp(-7 * dt);
    e.kx *= damp; e.ky *= damp;
    if (e.entered) {
      var hitWall = false;
      if (e.bx < er) { e.bx = er; if (e.kx < 0) { if (e.kx < -12 * U) hitWall = true; e.kx = 0; } }
      else if (e.bx > W - er) { e.bx = W - er; if (e.kx > 0) { if (e.kx > 12 * U) hitWall = true; e.kx = 0; } }
      if (e.by < er) { e.by = er; if (e.ky < 0) { if (e.ky < -12 * U) hitWall = true; e.ky = 0; } }
      else if (e.by > H - er) { e.by = H - er; if (e.ky > 0) { if (e.ky > 12 * U) hitWall = true; e.ky = 0; } }
      if (hitWall && e.wallT <= 0) {   // 壁に当たった軽い演出（音なし）
        e.wallT = 0.25;
        fx('burst', e.bx, e.by, { count: 4, color: COL.washi, speed: 18 * U, size: 0.8 * U });
      }
    }

    var dx = willow.cx - e.bx, dy = willow.cy - e.by, d = Math.hypot(dx, dy) || 1;
    var ux = dx / d, uy = dy / d;
    var sp = (e.stun > 0 || e.pull) ? 0 : e.speed * U;
    if (e.haste > 0) sp *= e.hasteMul || CFG.HASTE_MUL;
    var off = 0, oy = 0, ph;
    if (e.type === 'boss') {
      // 怒り中は速く、放置されると突進に入る
      var rageMul = e.hp / e.maxHp <= CFG.BOSS_RAGE_HP ? CFG.BOSS_RAGE_SPEED : 1;
      e.idle += dt;
      var k = clamp((e.idle - CFG.BOSS_IDLE) / CFG.BOSS_RUSH_ACCEL, 0, 1);
      e.rush = k;
      e.roarT -= dt;
      if (e.roarT <= 0) { e.roarT = CFG.BOSS_ROAR_EVERY; bossRoar(e); }
      if (k > 0 && !e.rushWarned) {
        e.rushWarned = true;
        fx('popText', e.x, e.y - e.r * 1.4, '斬れ！', { size: 4 * U, color: COL.shu });
        fx('ring', e.x, e.y, { radius: e.r * 1.6, color: COL.shu, width: 1.2 * U, duration: 0.5 });
      }
      if (e.stun <= 0) {
        var base = e.speed * rageMul * U, top = CFG.BOSS_RUSH_SPEED * rageMul * U;
        sp = base + (top - base) * k * k;
      }
    }
    switch (e.type) {
      case 'hitodama':
        off = Math.sin(e.t * 2.3 + e.seed) * 2.6 * U;
        break;
      case 'karasu':
        off = Math.sin(e.t * 5 + e.seed) * 0.8 * U;
        break;
      case 'chochin':
        off = tri(e.t * 0.8 + e.seed) * 9 * U;
        e.rot = Math.sin(e.t * 4) * 0.12;
        break;
      case 'kasa':
        ph = Math.abs(Math.sin(e.t * 3.4 + e.seed));
        sp *= 0.25 + 1.5 * ph;
        oy = -ph * 5 * U;
        e.rot = Math.sin(e.t * 3.4 + e.seed) * 0.22;
        break;
      case 'daruma':
        e.rot = Math.sin(e.t * 3 + e.seed) * 0.16;
        break;
      case 'bunshin':
        off = Math.sin(e.t * 3 + e.seed) * 1.2 * U;
        break;
      case 'tosshin':
        e.ang = Math.atan2(dy, dx);
        if (e.phase === 'approach') {
          e.trav += sp * dt;
          if (e.trav >= CFG.TOSSHIN_APPROACH * U) {
            e.phase = 'aim'; e.aim = 0;
            e.aimT = Math.max(CFG.TOSSHIN_AIM_MIN, CFG.TOSSHIN_AIM_BASE - CFG.TOSSHIN_AIM_DEC * G.wave);
            sfx('aim');
          }
        } else if (e.phase === 'aim') {
          sp = 0;
          if (e.stun <= 0 && !e.pull) e.aim = Math.min(1, e.aim + dt / e.aimT);   // 止められている間は狙いも進まない
          if (e.aim >= 1) e.phase = 'rush';
        } else {
          sp = CFG.TOSSHIN_RUSH_SPEED * U;
        }
        break;
      case 'tate':
        e.face = Math.atan2(uy, ux);
        break;
      case 'kemuri':
        off = Math.sin(e.t * 1.3 + e.seed) * CFG.KEMURI_SWAY * U;
        oy = Math.sin(e.t * 0.9 + e.seed * 2) * 2 * U;
        break;
      case 'boss':
        off = Math.sin(e.t * 0.8 + e.seed) * 3 * U;
        e.rot = Math.sin(e.t * 1.1) * 0.05 + clamp((e.kx * ux + e.ky * uy) / (60 * U), -0.4, 0.4);
        break;
    }
    if (e.hold > 0) { sp = 0; off = 0; oy = 0; }   // 静: 動かない
    e.bx += ux * sp * dt; e.by += uy * sp * dt;
    var fade = Math.min(1, d / (26 * U)) * (1 - e.calm);
    var nx = e.bx - uy * off * fade, ny = e.by + ux * off * fade + oy * fade;
    if (dt > 1e-5) { e.vx = (nx - e.x) / dt; e.vy = (ny - e.y) / dt; }
    // のけぞり・鈴で止められている間は、揺れを足した見かけの位置も画面内に収める
    if (e.entered && (e.stun > 0 || e.pull || e.bellT > 0)) { nx = clamp(nx, er, W - er); ny = clamp(ny, er, H - er); }
    e.x = nx; e.y = ny;
  }

  // ===================== 得点・コンボ =====================
  function comboMult() {
    return Math.min(CFG.COMBO_MULT_MAX, 1 + Math.floor(G.combo / CFG.COMBO_STEP) * 0.5);
  }

  function addScore(base, x, y, big) {
    var v = Math.round(base * G.mult * comboMult() * (G.fever > 0 ? CFG.FEVER_MULT : 1));
    G.score += v;
    if (x !== undefined) {
      fx('popText', x, y, '+' + v, { size: (big ? 5 : 3) * U, color: G.fever > 0 ? COL.gold : (big ? COL.shu : COL.sumi) });
    }
    return v;
  }

  function addCombo() {
    G.combo++;
    G.comboTimer = CFG.COMBO_TIME;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    if (G.fever <= 0 && G.combo >= G.feverNext) startFever();
  }

  function breakCombo() {
    if (G.kana > 0) {   // 五文字は 0 に戻る
      G.kanaLost = { n: G.kana, t: 0 };
      G.kana = 0;
      fx('popText', W / 2, hudKanaY() + 3.7 * U + 25 * U, '途切れた…', { size: 3.6 * U, color: COL.shu });
      sfx('kanaLost');
    }
    G.combo = 0;
    G.comboTimer = 0;
    G.feverNext = CFG.FEVER_COMBO;
  }

  function startFever() {
    G.fever = CFG.FEVER_TIME;
    G.feverNext = G.combo + CFG.FEVER_COMBO;
    showBanner('一柳乱舞', { style: 'fever', sub: '得点二倍' });
    sfx('fever');
    au('setFever', true);
    fx('flash', COL.gold, 0.35, 0.4);
  }

  // 「一柳！」の大題字を小さな題字で上書きしない
  function showBanner(text, opts, x, y) {
    var minor = opts.style === 'issen';
    if (minor && G && G.time - G.lastIchiT < (G.lastIchiBig ? 1.3 : 0.7)) {
      fx('popText', x !== undefined ? x : W / 2, y !== undefined ? y : H * 0.35, text, { size: 6 * U, color: COL.shu });
      return;
    }
    fx('banner', text, opts);
  }

  // ===================== 文字進行と「一柳！」 =====================
  function advanceKana(x, y, r) {
    var step = G.kana;
    fx('kana', x, y - r * 0.6, CFG.KANA[step], { size: (8 + step * 0.9) * U, color: step === 4 ? COL.shu : COL.sumi, step: step });
    sfx('hit', { step: step, combo: G.combo });
    G.kana++;
    if (G.kana >= CFG.KANA.length) {
      G.kana = 0;
      triggerIchiyanagi();
    }
  }

  // big: 大入道撃破など強制的に大きい演出にするとき true。一柳の ICHI_BIG_EVERY 回目ごとも大
  function triggerIchiyanagi(big) {
    G.ichi++;
    big = !!big || G.ichi % CFG.ICHI_BIG_EVERY === 0;
    G.ichiPulse = 1;
    G.slotGlow = 0.7;
    G.lastIchiT = G.time;
    G.lastIchiBig = big;
    G.mult = Math.min(CFG.MULT_MAX, G.mult + 1);
    addGauge();
    fx('banner', '一柳！', { style: big ? 'ichiyanagi' : 'ichiSmall', sub: kansuji(G.ichi) + '度目' });
    sfx('ichiyanagi', { big: big });
    fx('flash', COL.washi, big ? CFG.ICHI_FLASH_BIG : CFG.ICHI_FLASH, big ? 0.3 : 0.2);
    fx('shake', (big ? CFG.ICHI_SHAKE_BIG : CFG.ICHI_SHAKE) * U, big ? 0.4 : 0.25);
    fx('ring', willow.cx, willow.cy, { radius: CFG.ICHI_BLAST_R * U, color: COL.shu, width: (big ? CFG.ICHI_RING_W_BIG : CFG.ICHI_RING_W) * U, duration: big ? 0.7 : 0.55 });
    fx('ring', willow.cx, willow.cy, { radius: CFG.ICHI_PUSH_R * U, color: COL.sumi, width: (big ? 1.2 : 0.7) * U, duration: big ? 1.0 : 0.7 });
    fx('leaves', willow.cx, willow.cy, big ? CFG.ICHI_LEAVES_BIG : CFG.ICHI_LEAVES);
    hitstop = Math.max(hitstop, big ? CFG.ICHI_HITSTOP_BIG : CFG.ICHI_HITSTOP);
    var slowTime = big ? CFG.ICHI_SLOW_TIME_BIG : CFG.ICHI_SLOW_TIME;
    if (slowT < slowTime) {   // 長いスローの途中で短いスローに上書きしない
      slowT = slowDur = slowTime;
      slowScale = CFG.ICHI_SLOW_SCALE;
    }
    G.score += CFG.ICHI_BONUS * G.mult;

    // 衝撃波で近くの妖を一掃（文字は進めない）
    var R = CFG.ICHI_BLAST_R * U, list = G.enemies.slice(), i, e, d, a;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.dead) continue;
      d = Math.hypot(e.x - willow.cx, e.y - willow.cy);
      if (d > R + e.r) continue;
      a = Math.atan2(e.y - willow.cy, e.x - willow.cx);
      if (e.type === 'boss') {
        damageEnemy(e, CFG.ICHI_BOSS_DAMAGE, a + Math.PI / 2, 'blast');
      } else {
        damageEnemy(e, 99, a + Math.PI / 2, 'blast');
      }
    }
    // 外側の生き残りは外向きに吹き飛ばして少し動けなくする（大入道は除く）
    var PR = CFG.ICHI_PUSH_R * U;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (e.dead || e.type === 'boss') continue;
      d = Math.hypot(e.x - willow.cx, e.y - willow.cy);
      if (d > PR + e.r) continue;
      a = Math.atan2(e.y - willow.cy, e.x - willow.cx);
      e.kx += Math.cos(a) * CFG.ICHI_PUSH * U;
      e.ky += Math.sin(a) * CFG.ICHI_PUSH * U;
      e.stun = Math.max(e.stun, CFG.ICHI_STUN);   // 静の波の hold はそのまま
      if (e.type === 'tosshin' && e.phase === 'rush') {   // 突進は止まり、狙いからやり直し
        e.phase = 'aim'; e.aim = 0;
        e.aimT = Math.max(CFG.TOSSHIN_AIM_MIN, CFG.TOSSHIN_AIM_BASE - CFG.TOSSHIN_AIM_DEC * G.wave);
      }
      fx('burst', e.x, e.y, { count: 4, color: COL.washi, speed: 22 * U, angle: a, spread: 0.8, size: 0.8 * U });
    }
  }

  // ===================== 斬る =====================
  // src: 'blade' 筆 / 'teppei' 助太刀 / 'blast' 衝撃波 / 'loop' 円封
  // power: 剛筆（溜め斬り）で斬ったとき true
  function damageEnemy(e, dmg, angle, src, power) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 1;
    e.hitCd = CFG.HIT_COOLDOWN;
    var kanaOk = src !== 'blast';   // 衝撃波で倒したぶんは進めない
    var ex = e.x, ey = e.y, er = e.r;
    if (e.hp <= 0) {
      killEnemy(e, angle, src, power);
    } else {
      fx('burst', ex, ey, { count: 6, color: COL.sumi, speed: 30 * U, size: 0.9 * U });
      fx('slashMark', ex - Math.cos(angle) * er * 1.4, ey - Math.sin(angle) * er * 1.4,
        ex + Math.cos(angle) * er * 1.4, ey + Math.sin(angle) * er * 1.4,
        { width: (power ? CFG.POWER_MARK_WIDTH : 0.9) * U, color: power ? COL.gold : COL.washi });
      if (e.type === 'boss') {
        // 怯まない（ダメージ演出のみ）。斬られた間は突進しない
        e.idle = 0; e.rushWarned = false;
        sfx('bossHit');
        fx('shake', 1.2 * U, 0.15);
        hitstop = Math.max(hitstop, 0.035);
        addScore(50, ex, ey - er);
        // HP が閾値を切るたび、周囲から取り巻きを呼ぶ
        while (e.summoned < CFG.BOSS_SUMMON_AT.length && e.hp / e.maxHp <= CFG.BOSS_SUMMON_AT[e.summoned]) {
          e.summoned++;
          bossSummon(e);
        }
      } else {
        e.stun = Math.max(e.stun, 0.12);
        addScore(30);
      }
      addCombo();
    }
    if (kanaOk && e.dead) advanceKana(ex, ey, er);   // 文字が進むのは倒したときだけ
  }

  // 分身妖が筆で倒れたら、斬り筋と直角の両側へ小分身に割れる（MAX_ENEMIES は無視）
  function splitBunshin(e, angle) {
    var pa = angle + Math.PI / 2, sg, m, ox, oy;
    for (sg = -1; sg <= 1; sg += 2) {
      ox = Math.cos(pa) * sg; oy = Math.sin(pa) * sg;
      m = makeEnemy('bunshin', e.x + ox * e.r, e.y + oy * e.r, 1);
      m.mini = true;
      m.ru = CFG.BUNSHIN_MINI_R; m.r = m.ru * U;
      m.speed = e.speed * CFG.BUNSHIN_MINI_SPEED;
      m.score = CFG.BUNSHIN_MINI_SCORE;
      m.kx = ox * CFG.BUNSHIN_MINI_KNOCK * U; m.ky = oy * CFG.BUNSHIN_MINI_KNOCK * U;
      m.hitCd = CFG.BUNSHIN_MINI_CD;
      m.entered = e.entered;   // 画面内の妖から割れた小分身は画面外へ飛ばさない
      G.enemies.push(m);
    }
    fx('burst', e.x, e.y, { count: 8, color: COL.ai, speed: 35 * U, angle: pa, spread: TAU, size: 0.9 * U });
  }

  function bossSummon(e) {
    if (G.enemies.length < CFG.MAX_ENEMIES + 12) spawnRing(CFG.BOSS_SUMMON_N + 2 * (G.bossCount - 1));
    fx('banner', e.summoned >= CFG.BOSS_SUMMON_AT.length ? '百鬼夜行' : '手下あらわる', { style: 'wave' });
    sfx('bossAppear');
    fx('shake', 1.6 * U, 0.35);
  }

  function killEnemy(e, angle, src, power) {
    e.dead = true;
    var boss = e.type === 'boss';
    addCombo();
    fx('sliceEnemy', e, angle);
    fx('splat', e.x, e.y, { size: e.r * (boss ? 2.2 : 1.5), color: COL.sumi, angle: angle });
    fx('burst', e.x, e.y, { count: boss ? 40 : 10, color: boss ? COL.shu : COL.sumi, speed: (boss ? 70 : 45) * U, angle: angle, spread: boss ? TAU : 1.3, size: (boss ? 1.6 : 1) * U });
    var L = e.r * (boss ? 2.2 : 2.6);
    fx('slashMark', e.x - Math.cos(angle) * L, e.y - Math.sin(angle) * L, e.x + Math.cos(angle) * L, e.y + Math.sin(angle) * L,
      { width: (power ? CFG.POWER_MARK_WIDTH : (boss ? 2 : 1.1)) * U, color: power ? COL.gold : COL.washi });
    addScore(e.score, e.x, e.y + e.r * 0.4, boss);
    if (e.shieldBroken) {
      fx('popText', e.x, e.y - e.r * 1.2, '盾割り！', { size: 4.4 * U, color: COL.gold });
      addScore(CFG.TATE_BREAK_BONUS, e.x, e.y - e.r * 0.2);
    }
    if (e.type === 'bunshin' && !e.mini && src === 'blade') splitBunshin(e, angle);
    if (src === 'blade') {
      stroke.kills++;
      stroke.lastKillT = nowSec();
      if (stroke.kills >= CFG.YANAGI_GIRI_COUNT && !stroke.giri) {
        stroke.giri = true;
        yanagiGiri(e.x, e.y);
      }
    }
    if (boss) {
      sfx('bossDown');
      fx('flash', COL.shu, 0.4, 0.5);
      fx('shake', 4 * U, 0.7);
      fx('ring', e.x, e.y, { radius: 45 * U, color: COL.sumi, width: 3 * U, duration: 0.9 });
      hitstop = Math.max(hitstop, 0.16);
      if (G.life < CFG.LIFE_MAX) {
        G.life++;
        fx('popText', willow.cx, willow.cy - willow.size * 0.4, '柳、芽吹く', { size: 4 * U, color: COL.yanagi });
      }
      // 大妖を討てば必ず「一柳！」
      G.kana = 0;
      triggerIchiyanagi(true);
    } else {
      fx('shake', 0.7 * U, 0.1);
      hitstop = Math.max(hitstop, 0.018);
    }
  }

  function addGauge() {
    if (G.gauge >= CFG.TEPPEI_GAUGE_MAX) return;
    G.gauge++;
    var x = btn.teppei.x - btn.teppei.r, y = btn.teppei.y - btn.teppei.r * 1.6;
    if (G.gauge === CFG.TEPPEI_GAUGE_AUTO) {
      fx('popText', x, y, '助太刀できるぞ！', { size: 3.4 * U, color: COL.ai });
    } else if (G.gauge === CFG.TEPPEI_GAUGE_MAX) {
      fx('popText', x, y, '道を指せるぞ！', { size: 3.4 * U, color: COL.shu });
    }
  }

  function yanagiGiri(x, y) {
    G.score += CFG.YANAGI_GIRI_BONUS * G.mult;
    showBanner('いちやなぎ斬り', { style: 'issen', sub: '一筆五斬' }, x, y - 8 * U);
    sfx('issen', { count: CFG.YANAGI_GIRI_COUNT });
    fx('flash', COL.washi, 0.35, 0.2);
    addGauge();
  }

  function finalizeStroke() {
    var k = stroke.kills;
    stroke.kills = 0;
    stroke.giri = false;
    if (!G || mode !== 'play') return;
    if (k >= 2 && k < CFG.YANAGI_GIRI_COUNT) {
      var bonus = Math.round(CFG.STROKE_BONUS * k * k * G.mult);
      G.score += bonus;
      showBanner(CFG.STROKE_NAMES[k] || '一閃', { style: 'issen', sub: '+' + bonus }, pointer.x, pointer.y - 8 * U);
      sfx('issen', { count: k });
    }
  }

  function segCircle(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? clamp(((cx - x1) * dx + (cy - y1) * dy) / l2, 0, 1) : 0;
    var px = x1 + dx * t - cx, py = y1 + dy * t - cy;
    return px * px + py * py <= r * r;
  }

  // 筆の線分で当たりを取る（速い筆でもすり抜けない）
  function sliceSegment(x1, y1, x2, y2, power) {
    var angle = Math.atan2(y2 - y1, x2 - x1), pad = (CFG.BLADE_PAD + (power ? CFG.POWER_PAD : 0)) * U;
    var list = G.enemies.slice(), i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.dead || e.hitCd > 0) continue;
      if (!segCircle(x1, y1, x2, y2, e.x, e.y, e.r + pad)) continue;
      if (e.type === 'kemuri') {
        // 煙はすり抜ける
        e.wisp = 1;
        e.hitCd = CFG.KEMURI_PASS_CD;
        sfx('puff');
        fx('burst', e.x, e.y, { count: 5, color: '#8a8f9c', speed: 22 * U, size: 1 * U });
        continue;
      }
      if (e.type === 'tate') {
        // 始点から見て正面から入った斬りは弾く（溜め斬りは割る）
        var vx = x1 - e.x, vy = y1 - e.y, vl = Math.hypot(vx, vy) || 1;
        if ((vx / vl) * Math.cos(e.face) + (vy / vl) * Math.sin(e.face) > CFG.TATE_FRONT_DOT) {
          if (power) {
            e.shieldBroken = true;
          } else {
            parryBlade(e, x1, y1, x2, y2, angle);
            return;
          }
        }
      }
      damageEnemy(e, power ? CFG.POWER_DAMAGE : 1, angle, 'blade', power);
    }
    var w = G.walker;
    if (w && w.mode === 'walk' && segCircle(x1, y1, x2, y2, w.x, w.y - w.r * 0.2, w.r)) ouchTeppei(w);
  }

  // 盾に弾かれた: 筆が一瞬使えなくなる（コンボは切らない）
  function parryBlade(e, x1, y1, x2, y2, angle) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? clamp(((e.x - x1) * dx + (e.y - y1) * dy) / l2, 0, 1) : 0;
    var cx = x1 + dx * t, cy = y1 + dy * t;
    e.guard = 1;
    e.hitCd = CFG.TATE_PARRY_CD;
    sfx('clang');
    fx('spark', cx, cy, angle);
    fx('shake', 0.8 * U, 0.1);
    bladeLock = CFG.BLADE_RECOIL;
    trail.length = 0;
    loopPts.length = 0;
    resetCharge();
  }

  // ===================== 溜め斬り =====================
  // 押したまま止まる（実時間）→ 溜め完了 → 動かすと剛筆
  function chargeEligible() {
    return mode === 'play' && !!G && !paused && !G.path && pointer.active && !pointer.ignore && bladeLock <= 0;
  }

  function resetCharge() {
    charge.on = false; charge.still = 0; charge.ready = false; charge.power = 0;
  }

  function startCharge() {
    resetCharge();
    charge.ox = pointer.x; charge.oy = pointer.y;
  }

  function updateCharge(rdt) {
    var C = charge;
    if (!chargeEligible()) {
      if (C.on || C.still > 0 || C.ready || C.power > 0) resetCharge();
      return;
    }
    C.on = true;
    if (C.power > 0) {
      C.power -= rdt;
      if (C.power <= 0) { C.power = 0; C.ready = false; C.still = 0; C.ox = pointer.x; C.oy = pointer.y; }
      return;
    }
    if (!C.ready) {
      C.still += rdt;
      if (C.still >= CFG.CHARGE_TIME) { C.ready = true; sfx('chargeReady'); }
    }
  }

  // ポインタが動いたとき（pointer.x/y 更新後）に呼ぶ
  function chargeMoved() {
    var C = charge;
    if (!chargeEligible() || C.power > 0) return;
    if (Math.hypot(pointer.x - C.ox, pointer.y - C.oy) <= CFG.CHARGE_STILL * U) return;
    if (C.ready) {
      C.ready = false;
      C.power = CFG.POWER_TIME;
      sfx('power');
    } else {
      C.ox = pointer.x; C.oy = pointer.y; C.still = 0;
    }
  }

  // ===================== 円封 =====================
  function segInter(ax, ay, bx, by, cx, cy, dx, dy) {
    var rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    var den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((cx - ax) * sy - (cy - ay) * sx) / den;
    var u = ((cx - ax) * ry - (cy - ay) * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: ax + rx * t, y: ay + ry * t };
  }

  function pointInPoly(x, y, poly) {
    var inside = false, i, j = poly.length - 1, a, b;
    for (i = 0; i < poly.length; i++) {
      a = poly[i]; b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      j = i;
    }
    return inside;
  }

  // 一筆の点列に点を足し、直近 3 本を除く過去の線分と交われば輪として判定する
  function loopAdd(x, y, now) {
    var n, i, k, a, b, X = null, idx = -1;
    while (loopPts.length && now - loopPts[0].t > CFG.LOOP_WINDOW) loopPts.shift();
    n = loopPts.length;
    if (n > 0 && Math.hypot(x - loopPts[n - 1].x, y - loopPts[n - 1].y) < CFG.LOOP_STEP * U) return;
    loopPts.push({ x: x, y: y, t: now });
    n = loopPts.length;
    if (n < 5 || !G || mode !== 'play' || G.path) return;
    a = loopPts[n - 2]; b = loopPts[n - 1];
    for (i = 0; i + 1 <= n - 5; i++) {
      X = segInter(a.x, a.y, b.x, b.y, loopPts[i].x, loopPts[i].y, loopPts[i + 1].x, loopPts[i + 1].y);
      if (X) { idx = i; break; }
    }
    if (!X) return;
    // 交点から先の点列で多角形
    var poly = [{ x: X.x, y: X.y }];
    for (k = idx + 1; k <= n - 2; k++) poly.push({ x: loopPts[k].x, y: loopPts[k].y });
    var per = 0, area = 0, p, q;
    for (k = 0; k < poly.length; k++) {
      p = poly[k]; q = poly[(k + 1) % poly.length];
      per += Math.hypot(q.x - p.x, q.y - p.y);
      area += p.x * q.y - q.x * p.y;
    }
    area = Math.abs(area) / 2;
    if (per > CFG.LOOP_MAX_PERIM * U || area < Math.pow(CFG.LOOP_MIN_SIZE * U, 2)) return;
    if (now - lastLoopT < CFG.LOOP_CD) return;
    sealLoop(poly, Math.atan2(b.y - a.y, b.x - a.x));
    if (sealLoop.count > 0) {
      lastLoopT = now;
      loopPts.length = 0;
    } else {
      loopPts.splice(0, idx + 1);   // 同じ輪を何度も判定しない
    }
  }

  // 多角形の内側の妖を封じる。封じた数は sealLoop.count に入る
  function sealLoop(poly, ang) {
    var list = G.enemies.slice(), i, e, n = 0, hit = [];
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.dead || !pointInPoly(e.x, e.y, poly)) continue;
      if (e.type === 'boss' && e.hitCd > 0) continue;
      hit.push(e);
    }
    sealLoop.count = 0;
    if (!hit.length) return;
    for (i = 0; i < hit.length; i++) {
      e = hit[i];
      if (e.dead) continue;
      if (e.type === 'boss') damageEnemy(e, CFG.LOOP_BOSS_DAMAGE, ang, 'loop');
      else damageEnemy(e, 99, ang, 'loop');
      n++;
    }
    sealLoop.count = n;
    if (n < 1) return;
    fx('sealLoop', poly, { count: n });
    sfx('seal', { count: n });
    if (n >= 2) {
      var bonus = Math.round(CFG.LOOP_BONUS * n * n * G.mult);
      G.score += bonus;
      showBanner('円封', { style: 'issen', sub: '+' + bonus }, pointer.x, pointer.y - 8 * U);
    }
  }

  // ===================== 鈴 =====================
  // 鳴らせる状態か（play 中・非ポーズ・経路指定中でない）
  function bellAvailable() {
    return mode === 'play' && !!G && !paused && !G.path;
  }

  // (x,y) で鈴を鳴らし、周りの妖を点へ寄せて止める。鳴らしたら true（クールダウン中は不発）
  function ringBell(x, y) {
    if (!bellAvailable()) return false;
    if (G.bellCd > 0) {   // 空振り: 小さな音とアイコンの揺れだけ
      G.bellShake = CFG.BELL_SHAKE;
      sfx('bellEmpty');
      return false;
    }
    G.bellCd = CFG.BELL_CD;
    var R = CFG.BELL_R * U, list = [], i, j, e, d, a, n, it, k, dx, dy, dd, minD;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (e.dead || e.type === 'boss' || e.hold > 0) continue;
      if (Math.hypot(e.x - x, e.y - y) > R) continue;
      list.push(e);
    }
    n = list.length;
    // 寄せ先: もとの方角を保ち、3〜6U の距離に散らす
    var near = CFG.BELL_GATHER_R * U, T = [];
    for (i = 0; i < n; i++) {
      e = list[i];
      a = Math.atan2(e.y - y, e.x - x);
      d = (3 + 3 * ((i * 0.618) % 1)) * U;
      T.push({ e: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
    }
    // 妖同士が重ならないよう押し離し、柳には触れない位置へ押し出す
    var wr = willow.cr + CFG.BELL_WILLOW_PAD * U;
    for (it = 0; it < 16; it++) {
      for (i = 0; i < n; i++) {
        for (j = i + 1; j < n; j++) {
          dx = T[j].x - T[i].x; dy = T[j].y - T[i].y; dd = Math.hypot(dx, dy);
          minD = (T[i].e.r + T[j].e.r) * 0.8;
          if (dd >= minD) continue;
          if (dd < 1e-3) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); dd = 1; }
          k = (minD - dd) / 2 / dd;
          T[i].x -= dx * k; T[i].y -= dy * k; T[j].x += dx * k; T[j].y += dy * k;
        }
      }
      for (i = 0; i < n; i++) {
        e = T[i].e;
        d = Math.hypot(T[i].x - willow.cx, T[i].y - willow.cy);
        minD = wr + e.r;
        if (d < minD) {
          if (d < 1e-3) { dx = 0; dy = -1; d = 1; } else { dx = (T[i].x - willow.cx) / d; dy = (T[i].y - willow.cy) / d; }
          T[i].x = willow.cx + dx * minD; T[i].y = willow.cy + dy * minD;
        }
        T[i].x = clamp(T[i].x, e.r, W - e.r); T[i].y = clamp(T[i].y, e.r, H - e.r);
      }
    }
    for (i = 0; i < n; i++) {
      e = T[i].e;
      e.pull = { t: 0, sx: e.bx, sy: e.by, tx: T[i].x, ty: T[i].y };
      e.bellT = CFG.BELL_PULL_TIME + CFG.BELL_STUN;
      e.kx = 0; e.ky = 0;
      if (e.type === 'tosshin' && (e.phase === 'rush' || e.phase === 'aim')) {   // 突進は止まり、狙いからやり直し
        e.phase = 'aim'; e.aim = 0;
        e.aimT = Math.max(CFG.TOSSHIN_AIM_MIN, CFG.TOSSHIN_AIM_BASE - CFG.TOSSHIN_AIM_DEC * G.wave);
      }
    }
    // 歩いている哲平は吹っ飛ばす（助太刀ダッシュ中の哲平は対象外）
    var tw = G.walker;
    if (tw && (tw.mode === 'walk' || tw.mode === 'ouch') && Math.hypot(tw.x - x, tw.y - y) <= R) flyTeppei(tw, x, y);
    fx('bell', x, y, R);
    sfx('bell');
    if (n >= 1) fx('popText', x, y - 6 * U, '寄れ！', { size: 4.2 * U, color: COL.gold });
    return true;
  }

  // 押下が「短いタップ」の範囲を出たら鈴の候補から外す。タッチ・ペンは範囲内の間 true（斬撃・溜めにしない）
  function bellTapPending(p, now) {
    var B = bellTap;
    if (!B || B.cancel) return false;
    if (now - B.t > CFG.BELL_TAP_TIME || Math.hypot(p.x - B.x, p.y - B.y) > CFG.BELL_TAP_MOVE * U) { B.cancel = true; return false; }
    return B.touch;
  }

  // ===================== 哲平 =====================
  function spawnWalker() {
    var dir = Math.random() < 0.5 ? 1 : -1, r = CFG.TEPPEI_R * U;
    // 柳の前か、上の方を横切る
    var y = Math.random() < 0.6 ? rand(H * 0.86, H * 0.93) - safe.b : rand(H * 0.3, H * 0.4);
    G.walker = { x: dir > 0 ? -r * 2 : W + r * 2, y: y, r: r, dir: dir, t: 0, mode: 'walk', ouch: 0 };
  }

  // 鈴で吹っ飛ぶ: 鈴の点から遠ざかる向き + 上向きの初速で放物線、回りながら画面外へ。罰なし
  function flyTeppei(w, bx, by) {
    var a = Math.atan2(w.y - by, w.x - bx), ux = Math.cos(a), uy = Math.sin(a);
    var sx = ux >= 0 ? 1 : -1, hx = Math.max(Math.abs(ux), 0.7);   // 真上・真下にならないよう横成分を最低限持たせる
    var out = (sx > 0 ? W - w.x : w.x) + w.r * 3;
    w.mode = 'fly';
    w.vx = sx * Math.max(hx * CFG.TEPPEI_FLY_SPEED * U, out / CFG.TEPPEI_FLY_TIME);
    w.vy = uy * CFG.TEPPEI_FLY_SPEED * U * 0.4 - CFG.TEPPEI_FLY_UP * U;
    w.rot = 0; w.vrot = sx * CFG.TEPPEI_FLY_SPIN; w.flyT = 0;
    sfx('teppeiFly');
    fx('popText', w.x, w.y - w.r * 2.2, 'あ〜れ〜', { size: 5 * U, color: COL.ai });
    fx('burst', bx, by, { count: 8, color: COL.gold, speed: 22 * U, size: 0.8 * U });
  }

  function ouchTeppei(w) {
    w.mode = 'ouch';
    w.ouch = CFG.TEPPEI_OUCH_TIME;
    sfx('teppeiOuch');
    fx('popText', w.x, w.y - w.r * 2.2, 'いてっ', { size: 5.5 * U, color: COL.ai });
    fx('popText', w.x, w.y - w.r * 3.6, '哲平は味方だ！', { size: 3 * U, color: COL.shu });
    fx('burst', w.x, w.y - w.r, { count: 8, color: COL.ai, speed: 25 * U, size: 0.8 * U });
    fx('shake', 1.2 * U, 0.2);
    breakCombo();
  }

  function updateWalker(dt) {
    var w = G.walker;
    if (!w) {
      if (G.dash) return;
      G.walkerTimer -= dt;
      if (G.walkerTimer <= 0) {
        spawnWalker();
        G.walkerTimer = rand(CFG.TEPPEI_WALK_MIN, CFG.TEPPEI_WALK_MAX);
      }
      return;
    }
    w.t += dt;
    if (w.mode === 'fly') {
      w.flyT += dt;
      w.vy += CFG.TEPPEI_FLY_GRAV * U * dt;
      w.x += w.vx * dt; w.y += w.vy * dt; w.rot += w.vrot * dt;
      if (w.x < -w.r * 3 || w.x > W + w.r * 3 || w.y > H + w.r * 3 || w.flyT > 1.5) G.walker = null;
      return;
    }
    if (w.mode === 'ouch') {
      w.ouch -= dt;
      if (w.ouch <= 0) w.mode = 'walk';
    } else {
      w.x += w.dir * CFG.TEPPEI_WALK_SPEED * U * dt;
    }
    if ((w.dir > 0 && w.x > W + w.r * 2.5) || (w.dir < 0 && w.x < -w.r * 2.5)) G.walker = null;
  }

  function teppeiReady() {
    return mode === 'play' && G && !G.dash && !G.path && G.gauge >= CFG.TEPPEI_GAUGE_AUTO;
  }

  function pathReady() {
    return teppeiReady() && G.gauge >= CFG.TEPPEI_GAUGE_MAX;
  }

  // おまかせダッシュ
  function callTeppei() {
    if (!teppeiReady() || paused) return;
    G.gauge -= CFG.TEPPEI_GAUGE_AUTO;
    startAutoDash();
  }

  function startAutoDash() {
    G.dashSeq++;
    // 妖がいちばん集まっている高さを駆け抜ける
    var y = willow.cy, n = 0, sy = 0, i, e;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (e.x > 0 && e.x < W && e.y > 0 && e.y < H) { sy += e.y; n++; }
    }
    if (n > 0) y = (sy / n) * 0.7 + willow.cy * 0.3;
    y = clamp(y, H * 0.18, H * 0.85);
    var dir = (G.dashSeq % 2) ? 1 : -1, r = CFG.TEPPEI_R * 1.2 * U;
    G.dash = { x: dir > 0 ? -r * 3 : W + r * 3, y: y, r: r, dir: dir, t: 0, mode: 'dash', seq: G.dashSeq, px: 0 };
    G.dash.px = G.dash.x;
    if (G.walker) G.walker = null;
    fx('banner', 'てっぺい！', { style: 'teppei', sub: '助太刀' });
    sfx('teppei');
    fx('flash', COL.ai, 0.3, 0.25);
    fx('shake', 1.6 * U, 0.3);
  }

  // ---- 経路指定 ----
  function scalePts(pts, sx, sy) {
    var out = [], i;
    for (i = 0; i < pts.length; i++) out.push({ x: pts[i].x * sx, y: pts[i].y * sy });
    return out;
  }

  function buildPath(pts) {
    var cum = [0], i, tot = 0;
    for (i = 1; i < pts.length; i++) {
      tot += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      cum.push(tot);
    }
    return { pts: pts, cum: cum, total: tot };
  }

  // 道の上の距離 s の位置と進行角
  function pathAt(P, s, hint) {
    var i = Math.max(1, hint || 1), n = P.pts.length;
    while (i < n - 1 && P.cum[i] < s) i++;
    var a = P.pts[i - 1], b = P.pts[i], seg = P.cum[i] - P.cum[i - 1] || 1;
    var f = clamp((s - P.cum[i - 1]) / seg, 0, 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ang: Math.atan2(b.y - a.y, b.x - a.x), i: i };
  }

  function pathMax() { return CFG.PATH_LEN_K * (W + H); }

  function enterPath() {
    if (!pathReady() || paused) return;
    if (pointer.hover) endPointer();
    G.path = { t: 0, pts: [], len: 0, drawing: false };   // ゲージは発動するまで使わない
    if (G.walker) G.walker = null;
    stroke.kills = 0; stroke.giri = false;
    sfx('teppei');
    fx('flash', COL.ai, 0.22, 0.25);
  }

  function addPathPoint(p) {
    var P = G.path, n = P.pts.length;
    if (!P.drawing) return;
    if (n === 0) { P.pts.push({ x: p.x, y: p.y }); return; }
    var last = P.pts[n - 1], dx = p.x - last.x, dy = p.y - last.y, d = Math.hypot(dx, dy);
    if (d < 0.8 * U) return;
    var room = pathMax() - P.len;
    if (room <= 0) return;
    if (d > room) { dx *= room / d; dy *= room / d; d = room; }
    P.len += d;
    P.pts.push({ x: last.x + dx, y: last.y + dy });
  }

  function finishPath() {
    var P = G.path;
    G.path = null;
    if (pointer.active) pointer.ignore = true;   // 指が残っていても斬らない
    if (P.pts.length >= 2 && buildPath(P.pts).total > 4 * U) {
      G.gauge = Math.max(0, G.gauge - CFG.TEPPEI_GAUGE_MAX);
      launchPathDash(P.pts);
    } else {                                     // 何も描かなければおまかせ（3 だけ使う）
      G.gauge = Math.max(0, G.gauge - CFG.TEPPEI_GAUGE_AUTO);
      startAutoDash();
    }
  }

  function launchPathDash(pts) {
    var path = buildPath(pts), r = CFG.TEPPEI_R * 1.2 * U;
    G.dashSeq++;
    G.dash = { x: pts[0].x, y: pts[0].y, px: pts[0].x, py: pts[0].y, r: r, dir: 1, t: 0, mode: 'dash',
      seq: G.dashSeq, path: path, s: 0, hint: 1 };
    fx('banner', 'てっぺい！', { style: 'teppei', sub: '助太刀' });
    sfx('teppei');
    fx('flash', COL.ai, 0.3, 0.25);
    fx('shake', 1.6 * U, 0.3);
  }

  function updatePathMode(rdt) {
    G.path.t += rdt;
    if (G.path.t >= CFG.PATH_TIME) finishPath();
  }

  function updatePathDash(dt) {
    var d = G.dash, P = d.path, R = CFG.PATH_R * U;
    d.t += dt;
    d.px = d.x; d.py = d.y;
    var speed = Math.max(W, H) * CFG.PATH_SPEED_K;
    var s1 = Math.min(P.total, d.s + speed * dt);
    var stepLen = Math.max(1, R * 0.5), n = Math.max(1, Math.ceil((s1 - d.s) / stepLen)), k, pos, i, e, list;
    var s0 = d.s;
    for (k = 1; k <= n; k++) {
      pos = pathAt(P, s0 + (s1 - s0) * k / n, d.hint);
      d.hint = pos.i;
      d.x = pos.x; d.y = pos.y;
      if (Math.cos(pos.ang) > 0.15) d.dir = 1; else if (Math.cos(pos.ang) < -0.15) d.dir = -1;
      list = G.enemies.slice();
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (e.dead) continue;
        if (Math.hypot(e.x - pos.x, e.y - pos.y) > R + e.r) continue;
        if (e.type === 'boss') {
          if (G.time - (e.pathT === undefined ? -9 : e.pathT) < CFG.PATH_BOSS_CD) continue;
          e.pathT = G.time;
        } else {
          if (e.dashHit === d.seq) continue;
          e.dashHit = d.seq;
        }
        var L = e.r * 1.8;
        fx('slashMark', e.x - Math.cos(pos.ang) * L, e.y - Math.sin(pos.ang) * L,
          e.x + Math.cos(pos.ang) * L, e.y + Math.sin(pos.ang) * L, { width: 1 * U, color: COL.ai });
        damageEnemy(e, e.type === 'boss' ? CFG.TEPPEI_BOSS_DAMAGE : 99, pos.ang, 'teppei');
      }
    }
    d.s = s1;
    fx('burst', d.x, d.y + d.r * 0.6, { count: 2, color: COL.ai, speed: 20 * U, angle: d.dir > 0 ? Math.PI : 0, spread: 0.8, size: 0.8 * U });
    if (s1 >= P.total) {
      fx('burst', d.x, d.y, { count: 14, color: COL.ai, speed: 40 * U, spread: TAU, size: 1.1 * U });
      G.dash = null;
    }
  }

  function updateDash(dt) {
    var d = G.dash;
    if (!d) return;
    if (d.path) { updatePathDash(dt); return; }
    d.t += dt;
    d.px = d.x;
    d.x += d.dir * (W + d.r * 6) / CFG.TEPPEI_DASH_TIME * dt;
    var R = Math.max(CFG.TEPPEI_DASH_R * U, H * CFG.TEPPEI_DASH_R_H);
    var list = G.enemies.slice(), i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.dead || e.dashHit === d.seq) continue;
      // 通り過ぎた妖を斬る
      if ((d.dir > 0 ? e.x <= d.x : e.x >= d.x) && Math.abs(e.y - d.y) <= R + e.r) {
        e.dashHit = d.seq;
        var a = Math.atan2(e.y - d.y, d.dir * 40 * U);
        fx('slashMark', d.px, d.y, e.x + d.dir * e.r * 2, e.y, { width: 1 * U, color: COL.ai });
        damageEnemy(e, e.type === 'boss' ? CFG.TEPPEI_BOSS_DAMAGE : 99, a, 'teppei');
      }
    }
    fx('burst', d.x - d.dir * d.r, d.y + d.r * 0.6, { count: 2, color: COL.ai, speed: 20 * U, angle: d.dir > 0 ? Math.PI : 0, spread: 0.8, size: 0.8 * U });
    if ((d.dir > 0 && d.x > W + d.r * 3) || (d.dir < 0 && d.x < -d.r * 3)) G.dash = null;
  }

  // ===================== 柳 =====================
  function hurtWillow(n, e) {
    if (G.god) return;
    G.life = Math.max(0, G.life - n);
    if (G.life > 0) { G.invT = CFG.HURT_INVINCIBLE; G.invFxT = 0; }   // 無敵（ゲームオーバーになる被弾では付けない）
    G.hurt = 1;
    G.hurtPulse = 1;
    G.mult = Math.max(1, G.mult - 1);
    var deep = n >= 2, i;
    // 失った葉の位置（HUD で朱く光って散る）
    for (i = G.life; i < Math.min(CFG.LIFE_MAX, G.life + n); i++) G.lostLeaves.push({ i: i, t: 0 });
    sfx('damage', { deep: deep, left: G.life });
    fx('leaves', willow.cx, willow.cy, 14);
    fx('shake', 3 * U, 0.4);
    fx('flash', COL.shu, CFG.HURT_FLASH, CFG.HURT_FLASH_TIME);
    fx('splat', e.x, e.y, { size: e.r * 1.2, color: COL.shu, angle: 0 });
    fx('hurt', deep ? 1 : 0.8, {
      time: CFG.HURT_EDGE_TIME, x: willow.cx, y: willow.cy - willow.size * 0.55, size: (deep ? 9.5 : 8.5) * U,
      text: deep ? '柳に深手！' : '柳に傷！', sub: G.life > 0 ? '残り ' + kansuji(G.life) : ''
    });
    // 止め + 短いスロー（gameOver のスローとは競合しない: gameOver が後で上書きする）
    hitstop = Math.max(hitstop, CFG.HURT_HITSTOP);
    if (slowT < CFG.HURT_SLOW_TIME) {
      slowT = slowDur = CFG.HURT_SLOW_TIME;
      slowScale = CFG.HURT_SLOW_SCALE;
    }
    try { if (navigator.vibrate) navigator.vibrate(deep ? CFG.HURT_VIBRATE_DEEP : CFG.HURT_VIBRATE); } catch (err) { /* 振動できなくても続行 */ }
    if (G.life <= 0) gameOver();
  }

  function checkWillow() {
    var i, e, d;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (e.dead || e.pull) continue;   // 鈴で寄せている最中は柳に触れない
      d = Math.hypot(e.x - willow.cx, e.y - willow.cy);
      if (d < willow.cr + e.r * 0.6) {
        if (G.invT > 0) {   // 無敵中: ダメージなし。消えずに外へ弾き返す
          var ga = Math.atan2(e.by - willow.cy, e.bx - willow.cx);
          if (e.type === 'boss') {
            e.kx = Math.cos(ga) * 150 * U; e.ky = Math.sin(ga) * 150 * U;
            e.stun = Math.max(e.stun, 1.2); e.idle = 0; e.rushWarned = false;
          } else {
            e.kx = Math.cos(ga) * CFG.HURT_BOUNCE * U; e.ky = Math.sin(ga) * CFG.HURT_BOUNCE * U;
            e.stun = Math.max(e.stun, CFG.HURT_BOUNCE_STUN);
            if (e.type === 'tosshin' && (e.phase === 'rush' || e.phase === 'aim')) {
              e.phase = 'aim'; e.aim = 0;
              e.aimT = Math.max(CFG.TOSSHIN_AIM_MIN, CFG.TOSSHIN_AIM_BASE - CFG.TOSSHIN_AIM_DEC * G.wave);
            }
          }
          if (G.invFxT <= 0) {
            G.invFxT = CFG.HURT_GUARD_FX_GAP;
            fx('ring', willow.cx, willow.cy, { radius: (willow.cr + 4 * U), color: COL.yanagi, width: 0.9 * U, duration: 0.35 });
            sfx('bellEmpty');
          }
          continue;
        }
        if (e.type === 'boss') {
          // 大妖は消えずに弾かれる
          var a = Math.atan2(e.by - willow.cy, e.bx - willow.cx);
          e.kx = Math.cos(a) * 150 * U; e.ky = Math.sin(a) * 150 * U;
          e.stun = 1.2; e.idle = 0; e.rushWarned = false;
          hurtWillow(CFG.BOSS_TOUCH_DAMAGE, e);
        } else {
          e.dead = true;
          hurtWillow(G.wave >= CFG.HARD_WAVE ? 2 : 1, e);
        }
        if (mode !== 'play') return;
      }
    }
  }

  // ===================== 画面遷移 =====================
  function startGame() {
    G = newGame();
    mode = 'play';
    modeT = 0;
    paused = false;
    newBest = false;
    hitstop = 0; slowT = 0;
    stroke.kills = 0; stroke.giri = false;
    pointer.ignore = false;
    if (pointer.hover) { pointer.hover = false; pointer.active = false; }   // マウスの筆は動かしたとき改めて下ろす
    bladeLock = 0; loopPts.length = 0; lastLoopT = -9; resetCharge();
    bellTap = null;
    fx('reset');
    fx('flash', COL.washi, 0.6, 0.35);
    sfx('start');
    au('setFever', false);
    au('setIntensity', 0.15);
    au('startMusic');
  }

  function gameOver() {
    bellTap = null;
    if (pointer.hover) endPointer();
    mode = 'over';
    modeT = 0;
    slowT = slowDur = 1.6;
    slowScale = 0.15;
    if (G.score > best) {
      best = G.score;
      newBest = true;
      try { localStorage.setItem(CFG.BEST_KEY, String(best)); } catch (e) { /* 保存できなくても続行 */ }
    }
    sfx('gameover');
    au('setFever', false);
    au('stopMusic');
    fx('flash', COL.sumi, 0.5, 0.8);
    fx('shake', 5 * U, 0.8);
    fx('leaves', willow.cx, willow.cy, 40);
  }

  function setPaused(p) {
    if (mode !== 'play') { paused = false; return; }
    if (paused === p) return;
    paused = p;
    bellTap = null;
    endPointer();
    if (G && G.path) { G.path.drawing = false; G.path.pts = []; G.path.len = 0; }
    if (p) au('stopMusic'); else au('startMusic');
  }

  function toggleMute() {
    var m = !au('isMuted');
    au('setMuted', m);
    if (!m) sfx('ui');
  }

  function rankName(n) {
    var s = CFG.RANKS[0][1];
    for (var i = 0; i < CFG.RANKS.length; i++) if (n >= CFG.RANKS[i][0]) s = CFG.RANKS[i][1];
    return s;
  }

  // ===================== 更新 =====================
  function update(dt, rdt) {
    gameT += dt;
    if (mode !== 'play' || !G) return;
    if (G.tip) { G.tip.t -= rdt; if (G.tip.t <= 0) G.tip = null; }
    if (G.path) { updatePathMode(rdt); return; }   // 経路指定中は時が止まる
    G.time += dt;
    if (G.hurt > 0) G.hurt = Math.max(0, G.hurt - dt * 1.6);
    if (G.bellCd > 0) G.bellCd = Math.max(0, G.bellCd - dt);
    if (G.invT > 0) G.invT = Math.max(0, G.invT - dt);
    if (G.invFxT > 0) G.invFxT = Math.max(0, G.invFxT - dt);
    if (G.bellShake > 0) G.bellShake = Math.max(0, G.bellShake - rdt);
    if (G.slotGlow > 0) G.slotGlow -= rdt;
    if (G.ichiPulse > 0) G.ichiPulse = Math.max(0, G.ichiPulse - rdt * 2);
    if (G.hurtPulse > 0) G.hurtPulse = Math.max(0, G.hurtPulse - rdt / CFG.HURT_PULSE_TIME);
    for (var li = G.lostLeaves.length - 1; li >= 0; li--) {
      G.lostLeaves[li].t += rdt;
      if (G.lostLeaves[li].t > CFG.HURT_PULSE_TIME) G.lostLeaves.splice(li, 1);
    }
    if (G.kanaLost) { G.kanaLost.t += rdt; if (G.kanaLost.t > CFG.KANA_LOST_TIME) G.kanaLost = null; }
    if (G.combo > 0) {   // 経路指定・一休み中は update 自体が止まるので減らない
      G.comboTimer -= dt;
      if (G.comboTimer <= 0) breakCombo();
    }
    if (G.fever > 0) {
      G.fever -= dt;
      if (G.fever <= 0) { G.fever = 0; au('setFever', false); }
    }
    updateWave(dt);
    if (G.sei) { G.sei.t -= dt; if (G.sei.t <= 0) endSei(); }
    var i, e;
    for (i = 0; i < G.enemies.length; i++) updateEnemy(G.enemies[i], dt);
    updateWalker(dt);
    updateDash(dt);
    checkWillow();
    // 倒れた妖を取り除く
    var n = 0;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (!e.dead) G.enemies[n++] = e;
    }
    G.enemies.length = n;
    // 斬りが途切れたら 1 筆を締める
    if (stroke.kills > 0 && nowSec() - stroke.lastKillT > CFG.STROKE_IDLE) finalizeStroke();
  }

  function dangerLevel() {
    if (!G || mode === 'title') return 0;
    var d = (CFG.LIFE_MAX - G.life) / CFG.LIFE_MAX * 0.6, near = 0, i, e, q;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      q = 1 - (Math.hypot(e.x - willow.cx, e.y - willow.cy) - willow.cr) / (30 * U);
      if (q > near) near = q;
    }
    return clamp(d + clamp(near, 0, 1) * 0.4, 0, 1);
  }

  // ===================== 描画: 部品 =====================
  function text(str, x, y, size, font, color, align, base, outline) {
    ctx.font = Math.max(1, size).toFixed(1) + 'px ' + font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = base || 'alphabetic';
    if (outline !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.5, size * 0.16);
      ctx.strokeStyle = outline || COL.washi;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  // 幅に収まるよう字を縮めて描く
  function fitText(str, x, y, size, maxW, font, color, align, base, outline) {
    ctx.font = size.toFixed(1) + 'px ' + font;
    var w = ctx.measureText(str).width;
    if (w > maxW && w > 0) size *= maxW / w;
    text(str, x, y, size, font, color, align, base, outline);
    return size;
  }

  function leafIcon(x, y, s, on, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s * 0.75, s, 0);
    ctx.quadraticCurveTo(0, s * 0.75, -s, 0);
    ctx.closePath();
    if (on) {
      ctx.fillStyle = col || COL.yanagi;
      ctx.fill();
      ctx.strokeStyle = COL.sumi;
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = COL.sumi;
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundButton(b, fill, strokeCol, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.5, b.r * 0.1);
    ctx.strokeStyle = strokeCol;
    ctx.stroke();
    ctx.restore();
  }

  function drawMuteButton() {
    var b = btn.mute, muted = !!au('isMuted');
    roundButton(b, COL.washi, COL.sumi, 0.75);
    text('音', b.x, b.y + b.r * 0.06, b.r * 1.15, FONT_BRUSH, muted ? 'rgba(26,22,18,0.4)' : COL.sumi, 'center', 'middle', false);
    if (muted) {
      ctx.save();
      ctx.strokeStyle = COL.shu;
      ctx.lineWidth = Math.max(2, b.r * 0.16);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - b.r * 0.6, b.y - b.r * 0.6);
      ctx.lineTo(b.x + b.r * 0.6, b.y + b.r * 0.6);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPauseButton() {
    var b = btn.pause;
    roundButton(b, COL.washi, COL.sumi, 0.75);
    ctx.fillStyle = COL.sumi;
    if (paused) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.r * 0.3, b.y - b.r * 0.45);
      ctx.lineTo(b.x + b.r * 0.5, b.y);
      ctx.lineTo(b.x - b.r * 0.3, b.y + b.r * 0.45);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(b.x - b.r * 0.42, b.y - b.r * 0.42, b.r * 0.28, b.r * 0.84);
      ctx.fillRect(b.x + b.r * 0.14, b.y - b.r * 0.42, b.r * 0.28, b.r * 0.84);
    }
  }

  // 哲平ボタン: ゲージ 3〜4 は「哲」（おまかせ）、満タンは「道」（経路指定）
  function drawHelpButton() {
    var b = btn.help;
    roundButton(b, COL.washi, COL.sumi, 0.75);
    text('？', b.x, b.y + b.r * 0.06, b.r * 1.15, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
  }

  function drawTeppeiButton() {
    var b = btn.teppei, ready = teppeiReady(), full = pathReady(), f = clamp(G.gauge / CFG.TEPPEI_GAUGE_MAX, 0, 1);
    var pulse = ready ? 0.5 + 0.5 * Math.sin(uiT * (full ? 11 : 9)) : 0;
    ctx.save();
    if (ready) {
      ctx.globalAlpha = (full ? 0.35 : 0.25) + 0.25 * pulse;
      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (1.25 + (full ? 0.22 : 0.15) * pulse), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    roundButton(b, full ? COL.shu : (ready ? COL.ai : COL.washi), COL.sumi, ready ? 1 : 0.7);
    // ゲージの弧
    ctx.lineCap = 'round';
    ctx.lineWidth = b.r * 0.2;
    ctx.strokeStyle = 'rgba(26,22,18,0.18)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.02, 0, TAU); ctx.stroke();
    if (f > 0) {
      ctx.strokeStyle = ready ? COL.gold : COL.ai;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.02, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
    }
    // 「おまかせ」の目盛り
    var ta = -Math.PI / 2 + TAU * CFG.TEPPEI_GAUGE_AUTO / CFG.TEPPEI_GAUGE_MAX;
    ctx.strokeStyle = COL.sumi;
    ctx.lineWidth = Math.max(1, b.r * 0.07);
    ctx.beginPath();
    ctx.moveTo(b.x + Math.cos(ta) * b.r * 0.86, b.y + Math.sin(ta) * b.r * 0.86);
    ctx.lineTo(b.x + Math.cos(ta) * b.r * 1.18, b.y + Math.sin(ta) * b.r * 1.18);
    ctx.stroke();
    ctx.restore();
    text(full ? '道' : '哲', b.x, b.y + b.r * 0.05, b.r * 1.2, FONT_BRUSH, ready ? COL.washi : 'rgba(43,58,92,' + (0.35 + 0.65 * f) + ')', 'center', 'middle', false);
    if (full) {
      fitText('道を描け！', W - safe.r - 1.5 * U, b.y - b.r * 1.45, 3.6 * U * (1 + 0.06 * pulse), W * 0.4, FONT_BRUSH, COL.shu, 'right', 'alphabetic');   // 右端で切れないよう右寄せ
    } else if (ready) {
      text('助太刀！', b.x, b.y - b.r * 1.45, 3.6 * U * (1 + 0.06 * pulse), FONT_BRUSH, COL.shu, 'center', 'alphabetic');
    } else {
      text('てっぺい ' + G.gauge + '/' + CFG.TEPPEI_GAUGE_MAX, b.x, b.y - b.r * 1.35, 2.5 * U, FONT_BRUSH, COL.ai, 'center', 'alphabetic');
    }
    // キーの案内（マウス・キーボード環境のみ）
    if (finePointer) {
      var kx = W - safe.r - 3 * U, ky = H - safe.b - 1.2 * U;
      fitText(full ? 'R: 道 / Space: 助太刀' : 'Space', kx, ky, 2.4 * U, W * 0.4, FONT_BRUSH, COL.sumi, 'right', 'alphabetic');
    }
  }

  // 経路指定中: 画面を少し暗くして、なぞった道を見せる
  function drawPathOverlay() {
    var P = G.path, i, pts = P.pts;
    ctx.save();
    ctx.fillStyle = 'rgba(26,22,18,0.22)';
    ctx.fillRect(0, 0, W, H);
    if (pts.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.globalAlpha = 0.28; ctx.strokeStyle = COL.ai; ctx.lineWidth = CFG.PATH_R * U * 2;
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = COL.washi; ctx.lineWidth = 1.8 * U;
      ctx.stroke();
      ctx.strokeStyle = COL.ai; ctx.lineWidth = 0.9 * U;
      ctx.stroke();
    }
    if (pts.length) {
      var h = pts[pts.length - 1];
      ctx.fillStyle = COL.shu;
      ctx.beginPath(); ctx.arc(h.x, h.y, 1.6 * U, 0, TAU); ctx.fill();
    }
    ctx.restore();
    var cx = W / 2, top = safe.t + (W / U >= 140 ? 19 : 33) * U, bw = Math.min(W * 0.6, 60 * U), left = cx - bw / 2;
    text('哲平の道を描け！', cx, top + 4 * U, 5.4 * U, FONT_BRUSH, COL.washi, 'center', 'alphabetic', COL.sumi);
    // 残り時間
    var f = clamp(1 - P.t / CFG.PATH_TIME, 0, 1);
    ctx.fillStyle = 'rgba(26,22,18,0.75)'; ctx.fillRect(left - 1.5, top + 6.5 * U - 1.5, bw + 3, 1.6 * U + 3);
    ctx.fillStyle = f < 0.3 ? COL.shu : COL.ai; ctx.fillRect(left, top + 6.5 * U, bw * f, 1.6 * U);
    // 筆の長さ
    var lf = clamp(P.len / pathMax(), 0, 1);
    ctx.fillStyle = 'rgba(26,22,18,0.75)'; ctx.fillRect(left - 1.5, top + 9 * U - 1.5, bw + 3, 0.9 * U + 3);
    ctx.fillStyle = lf > 0.92 ? COL.shu : COL.gold; ctx.fillRect(left, top + 9 * U, bw * lf, 0.9 * U);
    if (!P.drawing && pts.length < 2) {
      fitText('指でなぞって道を決める（離すと出発）', cx, top + 14 * U, 2.8 * U, W * 0.92, FONT_BRUSH, COL.washi, 'center', 'alphabetic', COL.sumi);
      fitText('押すだけ・時間切れ → おまかせ（ゲージ 3 だけ使う）', cx, top + 18.4 * U, 2.6 * U, W * 0.92, FONT_BRUSH, COL.washi, 'center', 'alphabetic', COL.sumi);
    }
  }

  function drawBossBar(e) {
    var w = e.r * 2, h = Math.max(3, 1.1 * U), x = e.x - w / 2, y = e.y - e.r - 3.2 * U;
    ctx.fillStyle = 'rgba(26,22,18,0.75)';
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = COL.shu;
    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
    text('大入道', e.x, y - 0.8 * U, 2.8 * U, FONT_BRUSH, COL.sumi, 'center', 'alphabetic');
  }

  // ===================== 描画: HUD =====================
  // 柳の葉の列。被弾で 0.6 秒ほど脈打ち、失った葉は朱く光って散る。残りが少ないと朱で点滅し続ける
  function drawLeaves(x0, ly, wide) {
    var i, lx, s0 = 1.7 * U, pulse = G.hurtPulse, warn = G.life > 0 && G.life <= CFG.LIFE_WARN;
    var k = 1 + 0.55 * Math.sin(pulse * Math.PI) * (pulse > 0 ? 1 : 0);        // 0→大→0
    var blink = warn ? 0.5 + 0.5 * Math.sin(uiT * 9) : 0;
    if (warn || pulse > 0) {   // 列の後ろの朱の光
      var gw = 4 * U * k, ga = (warn ? 0.18 + 0.22 * blink : 0) + 0.35 * pulse;
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, ga);
      ctx.fillStyle = COL.shu;
      ctx.beginPath();
      ctx.ellipse(x0 + 1.8 * U + (CFG.LIFE_MAX - 1) * 1.95 * U, ly, (CFG.LIFE_MAX * 1.95 + 1.4) * U * (1 + 0.1 * (k - 1)), gw, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (i = 0; i < CFG.LIFE_MAX; i++) {
      lx = x0 + 1.8 * U + i * 3.9 * U;
      var on = i < G.life;
      leafIcon(lx, ly, s0 * (on ? k : 1), on, on && warn && blink > 0.5 ? COL.shu : (on && pulse > 0.5 ? '#9bb86a' : null));
    }
    for (i = 0; i < G.lostLeaves.length; i++) {   // 失った葉: 朱く光って膨らみ、散る
      var L = G.lostLeaves[i], q = clamp(L.t / CFG.HURT_PULSE_TIME, 0, 1);
      lx = x0 + 1.8 * U + L.i * 3.9 * U;
      ctx.save();
      ctx.globalAlpha = 1 - q;
      ctx.fillStyle = COL.shu;
      ctx.beginPath(); ctx.arc(lx, ly, s0 * (1.2 + 1.8 * q), 0, TAU); ctx.globalAlpha = 0.35 * (1 - q); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 1 - q;
      leafIcon(lx + (L.i - 2) * 1.2 * U * q, ly + 4 * U * q * q, s0 * (1 + 0.6 * (1 - q)), true, COL.shu);
      ctx.restore();
    }
    var gx = x0 + 1.8 * U + CFG.LIFE_MAX * 3.9 * U + 1.5 * U;
    if (G.invT > 0) {   // 守り: 葉の列の右に小さな字と残り時間のバー
      var gq = clamp(G.invT / CFG.HURT_INVINCIBLE, 0, 1);
      text('守り', gx, ly - 0.9 * U, 2.6 * U, FONT_BRUSH, COL.yanagi, 'left', 'middle');
      ctx.fillStyle = 'rgba(26,22,18,0.2)';
      ctx.fillRect(gx, ly + 1.1 * U, 8 * U, 0.7 * U);
      ctx.fillStyle = COL.yanagi;
      ctx.fillRect(gx, ly + 1.1 * U, 8 * U * gq, 0.7 * U);
      if (wide) gx += 10 * U;
    }
    if (warn) {
      ctx.save();
      ctx.globalAlpha = 0.65 + 0.35 * blink;
      if (wide) text('柳が危ない！', gx, ly, 2.9 * U, FONT_BRUSH, COL.shu, 'left', 'middle');
      else text('柳が危ない！', x0, ly + 6.9 * U, 3 * U, FONT_BRUSH, COL.shu, 'left', 'top');
      ctx.restore();
    }
  }

  // 無敵中の柳の結界: 当たり半径より少し大きい淡い緑の輪が脈打ち、残り時間に応じて弧が減る
  function drawGuard() {
    var q = clamp(G.invT / CFG.HURT_INVINCIBLE, 0, 1), pulse = 0.5 + 0.5 * Math.sin(uiT * 9);
    var r = willow.cr + (2.6 + 0.8 * pulse) * U, a = (q < 0.25 ? 0.4 + 0.6 * pulse : 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.16 * a;
    ctx.fillStyle = COL.yanagi;
    ctx.beginPath(); ctx.arc(willow.cx, willow.cy, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = (0.45 + 0.3 * pulse) * a;
    ctx.strokeStyle = COL.yanagi;
    ctx.lineWidth = Math.max(2, (0.7 + 0.3 * pulse) * U);
    ctx.beginPath(); ctx.arc(willow.cx, willow.cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * q); ctx.stroke();
    ctx.restore();
  }

  // 五文字の丸の中心の高さ
  function hudKanaY() {
    return safe.t + 3 * U + (W / U >= 140 ? 4.4 * U : 15.5 * U);
  }

  function drawHUD() {
    var pad = 3 * U, x0 = safe.l + pad, y0 = safe.t + pad;
    var wide = W / U >= 140;

    // 得点
    text(String(G.score), x0, y0, 6 * U, FONT_BOLD, COL.sumi, 'left', 'top');
    // 柳の葉（ライフ）
    var i, ly = y0 + 9.6 * U;
    drawLeaves(x0, ly, wide);
    var warnShift = (!wide && G.life > 0 && G.life <= CFG.LIFE_WARN) ? 4.4 * U : 0;   // 狭い画面では警告文の分だけ下を空ける
    // 倍率
    text('倍率 ×' + G.mult, x0, y0 + 12.4 * U, 3.1 * U, FONT_BRUSH, G.mult > 1 ? COL.shu : COL.sumi, 'left', 'top');
    // コンボ
    if (G.combo >= 2) {
      var cy = y0 + 17 * U + warnShift, feverOn = G.fever > 0;
      var cs = 4.2 * U * (1 + 0.25 * clamp(G.comboTimer / CFG.COMBO_TIME - 0.85, 0, 0.15) / 0.15);
      text(G.combo + '連撃', x0, cy, cs, FONT_BOLD, feverOn ? COL.gold : COL.shu, 'left', 'top', feverOn ? COL.sumi : COL.washi);
      ctx.fillStyle = 'rgba(26,22,18,0.2)';
      ctx.fillRect(x0, cy + 5.6 * U, 16 * U, 0.7 * U);
      ctx.fillStyle = feverOn ? COL.gold : COL.shu;
      ctx.fillRect(x0, cy + 5.6 * U, 16 * U * clamp(G.comboTimer / CFG.COMBO_TIME, 0, 1), 0.7 * U);
      if (comboMult() > 1) text('×' + comboMult(), x0 + 17 * U, cy + 6.6 * U, 2.6 * U, FONT_BOLD, COL.sumi, 'left', 'alphabetic');
    }
    if (G.fever > 0) {
      var fy = y0 + 25.5 * U + warnShift;
      text('一柳乱舞 得点二倍', x0, fy, 3.2 * U, FONT_BRUSH, COL.gold, 'left', 'top', COL.sumi);
      ctx.fillStyle = COL.gold;
      ctx.fillRect(x0, fy + 4.3 * U, 16 * U * clamp(G.fever / CFG.FEVER_TIME, 0, 1), 0.6 * U);
    }

    // い ち や な ぎ の五文字
    var sy = hudKanaY(), sr = 3.7 * U, gap = 8.6 * U, glow = G.slotGlow > 0;
    var tf = clamp(G.comboTimer / CFG.COMBO_TIME, 0, 1), lowBlink = G.kana > 0 && tf < CFG.KANA_LOW;
    var KL = G.kanaLost, kq = KL ? clamp(KL.t / CFG.KANA_LOST_TIME, 0, 1) : 0;
    for (i = 0; i < 5; i++) {
      var sx = W / 2 + (i - 2) * gap, lit = glow || i < G.kana, next = !glow && i === G.kana;
      if (KL && !glow && !lit && i < KL.n) {
        // 途切れた: 点いていた丸が朱→灰に落ちて揺れ、消える
        var kx = sx + Math.sin(KL.t * 48 + i) * (1 - kq) * 0.9 * U, ky = sy + kq * kq * 1.6 * U;
        ctx.beginPath();
        ctx.arc(kx, ky, sr, 0, TAU);
        ctx.fillStyle = 'rgb(' + Math.round(215 - 105 * kq) + ',' + Math.round(56 + 44 * kq) + ',' + Math.round(31 + 70 * kq) + ')';
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, 0.4 * U);
        ctx.strokeStyle = 'rgba(26,22,18,0.7)';
        ctx.stroke();
        ctx.globalAlpha = 1 - 0.5 * kq;
        text(CFG.KANA[i], kx, ky + sr * 0.08, sr * 1.35, FONT_BRUSH, COL.washi, 'center', 'middle', false);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.save();
      if (lowBlink && lit && !glow) ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(uiT * 16));   // 途切れそう
      ctx.beginPath();
      ctx.arc(sx, sy, sr * (glow ? 1.12 : 1), 0, TAU);
      ctx.fillStyle = lit ? (glow ? COL.gold : COL.shu) : 'rgba(242,234,216,0.7)';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, 0.4 * U);
      ctx.strokeStyle = next ? COL.shu : 'rgba(26,22,18,' + (lit ? 0.9 : 0.35) + ')';
      ctx.stroke();
      text(CFG.KANA[i], sx, sy + sr * 0.08, sr * 1.35, FONT_BRUSH, lit ? COL.washi : 'rgba(26,22,18,0.35)', 'center', 'middle', false);
      ctx.restore();
    }
    // 五文字の残り時間（コンボが切れるまで）
    if (G.kana >= 1 && !glow) {
      var bw = 4 * gap + 2 * sr, bx = W / 2 - bw / 2, by = sy + sr + 1.5 * U;
      ctx.fillStyle = 'rgba(26,22,18,0.2)';
      ctx.fillRect(bx, by, bw, 0.7 * U);
      ctx.fillStyle = lowBlink ? COL.shu : COL.sumi;
      ctx.fillRect(bx, by, bw * tf, 0.7 * U);
    }
    // 一柳の回数
    var ny = sy + sr + 8.2 * U, ns = 7.5 * U * (1 + 0.5 * G.ichiPulse);
    var numStr = String(G.ichi);
    ctx.font = ns.toFixed(1) + 'px ' + FONT_BOLD;
    var nw = ctx.measureText(numStr).width;
    ctx.font = (5.6 * U).toFixed(1) + 'px ' + FONT_BRUSH;
    var lw = ctx.measureText('一柳').width, tw = nw + 1.2 * U + lw, tx = W / 2 - tw / 2;
    text(numStr, tx, ny, ns, FONT_BOLD, G.ichi > 0 ? COL.shu : 'rgba(26,22,18,0.4)', 'left', 'alphabetic');
    text('一柳', tx + nw + 1.2 * U, ny, 5.6 * U, FONT_BRUSH, COL.sumi, 'left', 'alphabetic');

    // 波
    text(G.wave > 0 ? '第' + kansuji(G.wave) + '波' : '', x0, H - safe.b - pad, 4 * U, FONT_BRUSH, COL.sumi, 'left', 'alphabetic');

    drawBellHud(x0, H - safe.b - pad - 4 * U);
    drawTeppeiButton();
    drawTip();
    drawHelpButton();
    drawPauseButton();
    drawMuteButton();
  }

  // 鈴のアイコン + クールダウンの弧（「第N波」の上）。baseY: 「第N波」の字の下端
  function drawBellHud(x0, baseY) {
    var cd = G.bellCd, ready = cd <= 0, r = Math.max(3.4 * U, 13), cx = x0 + r + 0.4 * U, cy = baseY - 1.6 * U - r - 2.4 * U;
    var f = clamp(1 - cd / CFG.BELL_CD, 0, 1), sh = G.bellShake > 0 ? G.bellShake / CFG.BELL_SHAKE : 0;
    var swing = sh > 0 ? Math.sin(uiT * 46) * 0.5 * sh : (ready ? Math.sin(uiT * 2.2) * 0.04 : 0);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, 0.55 * U);
    ctx.strokeStyle = 'rgba(26,22,18,0.2)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = ready ? COL.gold : '#8f8a80';
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
    ctx.restore();
    fx('drawBell', ctx, cx, cy + r * 0.09, r * 0.62, { swing: swing, gray: !ready });
    var lx = cx + r + 1.6 * U;
    var lbl = finePointer ? 'クリック / B' : 'タップ';
    if (ready) text(lbl, lx, cy + 0.2 * U, Math.max(2.4 * U, 10), FONT_BRUSH, COL.sumi, 'left', 'middle');
    else text(Math.ceil(cd) + '', lx, cy + 0.2 * U, Math.max(2.4 * U, 10), FONT_BOLD, 'rgba(26,22,18,0.55)', 'left', 'middle');
  }

  // 初出の妖などのヒント（画面下中央の墨の帯）
  function drawTip() {
    var T = G.tip;
    if (!T) return;
    var a = clamp(Math.min(T.t, CFG.TIP_TIME - T.t) / 0.35, 0, 1);
    var narrow = W / U < 135;
    var bw = narrow ? Math.min(W - 6 * U, 94 * U) : Math.min(W * 0.6, 110 * U), bh = 7.4 * U;
    var by = narrow ? btn.teppei.y - btn.teppei.r - 14.5 * U : H - safe.b - 3 * U - bh;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(26,22,18,0.72)';
    ctx.fillRect(W / 2 - bw / 2, by, bw, bh);
    fitText(T.text, W / 2, by + bh / 2 + 0.2 * U, 3.6 * U, bw - 4 * U, FONT_BRUSH, COL.washi, 'center', 'middle', false);
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(242,234,216,0.86)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COL.sumi;
    ctx.lineWidth = Math.max(1.5, 0.5 * U);
    ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = Math.max(1, 0.2 * U);
    ctx.strokeRect(x + 1.2 * U, y + 1.2 * U, w - 2.4 * U, h - 2.4 * U);
    ctx.restore();
  }

  // ---- 操作説明の札（題字・一休みで共用） ----
  var HELP = {
    pc: ['マウスを動かす: 斬る（押さなくてよい） ／ 止めて溜めてから振る: 溜め斬り ／ ぐるりと囲む: 円封 ／ クリック: 鈴（妖を寄せて止める）',
         'Space: 助太刀　R: 道を描く　B: 鈴　P・Esc: 一休み　M: 音　H: 操作説明　Enter: 開始'],
    touch: ['なぞる: 斬る ／ 押して溜めて振る: 溜め斬り ／ ぐるりと囲む: 円封 ／ タップ: 鈴（妖を寄せて止める）',
            '右下「哲」: 助太刀（満タンで道を描ける）　右上: 一休み・音'],
    tips: ['妖を倒すたび い・ち・や・な・ぎ — 五つで「一柳！」。斬り続けていれば文字は消えない',
           '盾持ち: 後ろか横から斬る。溜め斬りなら正面から割れる',
           '煙の妖: 斬れない。筆でぐるりと囲んで封じる',
           '突進妖: 朱の線が出たら、突っ込む前に斬る',
           '分身妖: 斬ると二つに割れる',
           '哲平は味方。斬るとコンボが切れる。邪魔なら鈴で吹っ飛ばせる']
  };

  function setBrush(size) { ctx.font = size.toFixed(1) + 'px ' + FONT_BRUSH; }

  // 字数で折り返す
  function wrapChars(str, size, maxW) {
    var out = [], cur = '', i, t;
    setBrush(size);
    for (i = 0; i < str.length; i++) {
      t = cur + str.charAt(i);
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = str.charAt(i); } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }

  // 「／」や全角空白の切れ目で折り返す
  function packSegs(str, size, maxW) {
    var sep = str.indexOf(' ／ ') >= 0 ? ' ／ ' : '　', segs = str.split(sep), out = [], cur = '', i, t, j, w;
    setBrush(size);
    for (i = 0; i < segs.length; i++) {
      t = cur ? cur + sep + segs[i] : segs[i];
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = segs[i]; } else cur = t;
    }
    if (cur) out.push(cur);
    // 1 区切りでも幅を超える行は字数で折る
    var res = [];
    for (i = 0; i < out.length; i++) {
      setBrush(size);
      if (ctx.measureText(out[i]).width > maxW) {
        w = wrapChars(out[i], size, maxW);
        for (j = 0; j < w.length; j++) res.push(w[j]);
      } else res.push(out[i]);
    }
    return res;
  }

  // 札の中身の行を作る（gap: 小さな空き）
  function helpRows(size, maxW, withTips) {
    var rows = [], src = finePointer ? HELP.pc : HELP.touch, i, l, k;
    for (i = 0; i < src.length; i++) {
      l = packSegs(src[i], size, maxW);
      for (k = 0; k < l.length; k++) rows.push({ s: l[k] });
    }
    if (withTips) {
      rows.push({ gap: true });
      for (i = 0; i < HELP.tips.length; i++) {
        l = wrapChars('・' + HELP.tips[i], size, maxW);
        for (k = 0; k < l.length; k++) rows.push({ s: l[k] });
      }
    }
    return rows;
  }

  // 高さ maxH に収まる大きさを探す
  function fitHelp(w, maxH, size0, withTips) {
    var size = size0, minS = 1.7 * U, rows, lh, h, i;
    for (;;) {
      rows = helpRows(size, w - 7 * U, withTips);
      lh = size * 1.5;
      h = 4.6 * U + size * 2.2;
      for (i = 0; i < rows.length; i++) h += rows[i].gap ? lh * 0.5 : lh;
      if (h <= maxH || size <= minS) break;
      size = Math.max(minS, size * 0.94);
    }
    return { size: size, rows: rows, lh: lh, h: h };
  }

  function drawHelpPanel(x, y, w, maxH, size0, heading, withTips) {
    var F = fitHelp(w, maxH, size0, withTips), i, yy;
    panel(x, y, w, F.h);
    yy = y + 2.3 * U;
    text(heading, x + w / 2, yy + F.size * 1.1, F.size * 1.3, FONT_BRUSH, COL.shu, 'center', 'middle', false);
    yy += F.size * 2.2;
    for (i = 0; i < F.rows.length; i++) {
      if (F.rows[i].gap) { yy += F.lh * 0.5; continue; }
      text(F.rows[i].s, x + 3.5 * U, yy + F.lh / 2, F.size, FONT_BRUSH, COL.sumi, 'left', 'middle', false);
      yy += F.lh;
    }
    return F.h;
  }

  function drawTitle() {
    var cx = W / 2, maxW = W * 0.88;
    var land = W >= H * 1.05;                          // 横長は札を左右に並べる
    var ts = Math.min(land ? 13 * U : 16 * U, maxW / 7.2);
    var willowTop = willow.y - willow.size * 0.5 - 1 * U;
    var ls = 3.5 * U, lh = land ? 5 * U : 6 * U, ph = lh * 4 + 5 * U;
    var ty, py, pw, cw, cy0, ch;
    ctx.font = ts.toFixed(1) + 'px ' + FONT_BRUSH;
    var w1 = ctx.measureText('いちやなぎ').width, w2 = ctx.measureText('一閃').width;
    var lines = [
      '筆を走らせ、柳に迫る妖を斬れ',
      '妖を倒すたび い・ち・や・な・ぎ　五つそろえば「一柳！」',
      '斬り続けていれば文字は消えない。途切れると消える',
      '哲平は味方。斬らずに、助太刀を呼ぼう'
    ];
    var i, bottom;
    if (land) {
      ty = Math.max(safe.t + ts * 0.55 + 1.5 * U, H * 0.115);
      py = ty + ts * 0.5 + 3.5 * U;
      cw = Math.min((W * 0.94 - 2 * U) / 2, 92 * U);
      pw = cw;
      cy0 = py - 2.5 * U;
      ch = Math.max(14 * U, willowTop - cy0);
      panel(cx - 1 * U - pw, cy0, pw, ph);
      for (i = 0; i < lines.length; i++) {
        fitText(lines[i], cx - 1 * U - pw / 2, py + lh * (i + 0.5), ls, pw - 6 * U, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
      }
      var hh = drawHelpPanel(cx + 1 * U, cy0, pw, ch, 3.2 * U, '操作', false);
      bottom = cy0 + Math.max(ph, hh);
    } else {
      pw = Math.min(maxW, 104 * U);
      // 札を柳の上に収めるため、題字の高さを必要なぶん上げる
      var hp = fitHelp(pw, 40 * U, 3.1 * U, false).h;
      ty = clamp(willowTop - (ts * 0.5 + 5 * U + ph + 2.2 * U + hp), safe.t + ts * 0.55 + 2 * U, H * 0.17);
      py = ty + ts * 0.5 + 5 * U;
      panel(cx - pw / 2, py - 2.5 * U, pw, ph);
      for (i = 0; i < lines.length; i++) {
        fitText(lines[i], cx, py + lh * (i + 0.5), ls, pw - 6 * U, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
      }
      cy0 = py - 2.5 * U + ph + 2.2 * U;
      bottom = cy0 + drawHelpPanel(cx - pw / 2, cy0, pw, Math.max(10 * U, willowTop - cy0), 3.1 * U, '操作', false);
    }
    // 題字（いちやなぎ=墨、一閃=朱）
    var tx = cx - (w1 + w2) / 2;
    text('いちやなぎ', tx, ty, ts, FONT_BRUSH, COL.sumi, 'left', 'middle');
    text('一閃', tx + w1, ty, ts, FONT_BRUSH, COL.shu, 'left', 'middle');

    var by = Math.max(bottom + 6 * U, Math.min(H - 12 * U, willow.y + willow.size / 2 + 7 * U)), a = 0.55 + 0.45 * Math.sin(uiT * 4);
    ctx.save();
    ctx.globalAlpha = a;
    fitText(finePointer ? 'クリックで開始' : '画面を斬って開始', cx, by, 6.5 * U, maxW, FONT_BRUSH, COL.shu, 'center', 'middle');
    ctx.restore();
    if (best > 0) text('最高記録 ' + best, cx, by + 7.5 * U, 3.4 * U, FONT_BRUSH, COL.sumi, 'center', 'middle');
    drawMuteButton();
  }

  function drawOver() {
    var a = clamp((modeT - 0.5) / 0.6, 0, 1);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(26,22,18,0.35)';
    ctx.fillRect(0, 0, W, H);
    var cx = W / 2, pw = Math.min(W * 0.92, H * 0.92), ph = pw;
    var py = (H - ph) / 2, u = pw / 84;   // 札の大きさ基準の単位
    panel(cx - pw / 2, py, pw, ph);
    var y = py + 11 * u;
    text('柳、散る', cx, y, 10 * u, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
    y += 13 * u;
    text('得点', cx, y - 5.6 * u, 3 * u, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
    fitText(String(G.score), cx, y + 1 * u, 9 * u, pw - 8 * u, FONT_BOLD, COL.shu, 'center', 'middle', false);
    if (newBest) text('新記録！', cx, y + 7.6 * u, 3.6 * u, FONT_BRUSH, COL.shu, 'center', 'middle', false);
    else text('最高記録 ' + best, cx, y + 7.6 * u, 3 * u, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
    y += 17 * u;
    // 一柳の回数
    ctx.font = (9 * u).toFixed(1) + 'px ' + FONT_BOLD;
    var nw = ctx.measureText(String(G.ichi)).width;
    ctx.font = (7 * u).toFixed(1) + 'px ' + FONT_BRUSH;
    var lw = ctx.measureText('一柳').width, tx = cx - (nw + lw + 1.5 * u) / 2;
    text(String(G.ichi), tx, y, 9 * u, FONT_BOLD, COL.shu, 'left', 'middle', false);
    text('一柳', tx + nw + 1.5 * u, y, 7 * u, FONT_BRUSH, COL.sumi, 'left', 'middle', false);
    y += 9 * u;
    text('最大 ' + G.maxCombo + ' 連撃　第' + kansuji(Math.max(1, G.wave)) + '波', cx, y, 3.4 * u, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
    y += 9.5 * u;
    text('称号', cx, y - 4.6 * u, 2.8 * u, FONT_BRUSH, COL.sumi, 'center', 'middle', false);
    fitText(rankName(G.ichi), cx, y + 1.6 * u, 7.5 * u, pw - 8 * u, FONT_BRUSH, COL.ai, 'center', 'middle', false);
    y += 13 * u;
    if (modeT > 1.2) {
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(uiT * 4));
      fitText(finePointer ? 'クリックで再挑戦' : '斬って再挑戦', cx, y, 6 * u, pw - 8 * u, FONT_BRUSH, COL.shu, 'center', 'middle', false);
    }
    ctx.restore();
    drawMuteButton();
  }

  function drawPause() {
    ctx.save();
    ctx.fillStyle = 'rgba(26,22,18,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    var ty = safe.t + 11 * U;
    text('一休み', W / 2, ty, 9 * U, FONT_BRUSH, COL.washi, 'center', 'middle', COL.sumi);
    var bottomY = H - safe.b - 4.5 * U;
    var top = ty + 6.5 * U, pw = Math.min(W - safe.l - safe.r - 6 * U, 124 * U);
    drawHelpPanel(W / 2 - pw / 2, top, pw, Math.max(20 * U, bottomY - 4 * U - top), 3.4 * U, '操作と心得', true);
    fitText('画面を押して再開', W / 2, bottomY, 4.4 * U, W * 0.9, FONT_BRUSH, COL.washi, 'center', 'middle', COL.sumi);
    drawHelpButton();
    drawPauseButton();
    drawMuteButton();
  }

  // ===================== 描画: 全体 =====================
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.washi;
    ctx.fillRect(0, 0, W, H);

    var life = G ? G.life : CFG.LIFE_MAX;
    var st = {
      willow: { x: willow.x, y: willow.y, size: willow.size, life: mode === 'title' ? CFG.LIFE_MAX : life, maxLife: CFG.LIFE_MAX, hurt: G && mode !== 'title' ? G.hurt : 0 },
      fever: !!(G && mode === 'play' && G.fever > 0),
      danger: dangerLevel(),
      wave: G && mode !== 'title' ? G.wave : 0
    };

    ctx.save();
    fx('applyShake', ctx);
    fx('drawBackground', ctx, gameT, st);
    fx('drawStains', ctx);
    if (G && mode !== 'title') {
      var i, e;
      if (G.sei) {   // 静: 画面を少し暗くする
        ctx.fillStyle = CFG.SEI_DIM;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
      if (G.invT > 0) drawGuard();
      if (G.walker) fx('drawTeppei', ctx, G.walker);
      // 突進の狙い線（妖の下）
      for (i = 0; i < G.enemies.length; i++) {
        e = G.enemies[i];
        if (e.type === 'tosshin' && !e.dead && (e.phase === 'aim' || e.phase === 'rush')) {
          fx('drawAimLine', ctx, e.x, e.y, willow.cx, willow.cy, e.phase === 'rush' ? 1 : e.aim);
        }
      }
      for (i = 0; i < G.enemies.length; i++) {
        e = G.enemies[i];
        if (e.appear !== undefined && e.appear < 1) ctx.globalAlpha = e.appear;
        fx('drawEnemy', ctx, e);
        ctx.globalAlpha = 1;
      }
      if (G.dash) fx('drawTeppei', ctx, G.dash);
    }
    fx('drawParticles', ctx);
    if (mode === 'play' && charge.on && charge.power <= 0 && charge.still >= CFG.CHARGE_SHOW) {
      fx('drawCharge', ctx, pointer.x, pointer.y, clamp(charge.still / CFG.CHARGE_TIME, 0, 1), charge.ready);
    }
    if (trail.length > 1) {
      fx('drawTrail', ctx, trail, { color: (G && mode === 'play' && G.fever > 0) ? COL.shu : COL.sumi, width: CFG.TRAIL_WIDTH * U, power: charge.power > 0 });
    }
    ctx.restore();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    fx('drawOverlay', ctx);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    if (mode === 'title') {
      drawTitle();
    } else if (mode === 'play') {
      for (var j = 0; j < G.enemies.length; j++) if (G.enemies[j].type === 'boss') drawBossBar(G.enemies[j]);
      if (G.path) drawPathOverlay();
      if (paused) drawPause();   // 一休み中は操作説明を見せるため、HUD は隠す
      else drawHUD();
    } else {
      drawOver();
    }
  }

  // ===================== 主ループ =====================
  var lastT = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var rdt = lastT ? (ts - lastT) / 1000 : 0;
    lastT = ts;
    rdt = clamp(rdt, 0, CFG.DT_MAX);
    uiT += rdt;
    if (!paused) {
      modeT += rdt;
      if (bladeLock > 0) bladeLock = Math.max(0, bladeLock - rdt);
      updateCharge(rdt);
      if (pointer.hover && pointer.active && nowSec() - pointer.lt > CFG.STROKE_IDLE) endHoverStroke();   // 静止が続いたら一筆を締める
      // ヒットストップとスローモーションは時間の倍率で作る
      var scale = 1;
      if (slowT > 0) {
        slowT -= rdt;
        var p = 1 - clamp(slowT / slowDur, 0, 1);       // 0→1
        var ease = p < 0.65 ? 0 : (p - 0.65) / 0.35;
        scale = slowScale + (1 - slowScale) * ease * ease;
      }
      if (hitstop > 0) {
        hitstop -= rdt;
        scale = 0;
      }
      var dt = rdt * scale;
      update(dt, rdt);
      fx('update', dt);
    }
    // 軌跡は実時間で消える
    var now = nowSec(), cut = 0;
    while (cut < trail.length && now - trail[cut].t > CFG.TRAIL_LIFE) cut++;
    if (cut > 0) trail.splice(0, cut);
    render();
  }

  // ===================== 入力 =====================
  function evPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function inBtn(b, p, grow) {
    var r = b.r * (grow || 1.25);
    return (p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y) <= r * r;
  }
  function initAudio() {
    au('init');
    audioReady = true;
  }

  function endPointer() {
    pointer.ignore = false;
    pointer.hover = false;
    loopPts.length = 0;
    resetCharge();
    if (pointer.active) {
      pointer.active = false;
      finalizeStroke();
    }
  }

  // マウス常時モードの一筆を締める（筆は下りたまま。溜めは続く）
  function endHoverStroke() {
    finalizeStroke();
    loopPts.length = 0;
    stroke.len = 0;
  }

  function startStroke(p, now) {
    pointer.x = p.x; pointer.y = p.y;
    pointer.lt = now;
    stroke.kills = 0; stroke.len = 0; stroke.giri = false;
    trail.length = 0;
    loopPts.length = 0;
    loopPts.push({ x: p.x, y: p.y, t: now });
    startCharge();
    trail.push({ x: p.x, y: p.y, t: now });
  }

  function onDown(e) {
    e.preventDefault();
    initAudio();
    var isMouse = e.pointerType === 'mouse';
    if (pointer.active && !pointer.hover) return;   // 2 本目以降の指は無視
    if (isMouse && e.button !== 0) return;
    var p = evPos(e);
    lastPtr.x = p.x; lastPtr.y = p.y;
    bellTap = null;
    if (inBtn(btn.mute, p)) { toggleMute(); return; }
    if (mode === 'play') {
      if (inBtn(btn.pause, p) || inBtn(btn.help, p)) { sfx('ui'); setPaused(!paused); return; }
      if (paused) { setPaused(false); return; }
      if (G.path) {
        // 経路指定中: なぞり始める（マウスも押してなぞる）
        if (G.path.drawing || pointer.active) return;
        pointer.active = true; pointer.hover = false; pointer.ignore = false;
        pointer.id = e.pointerId; pointer.x = p.x; pointer.y = p.y; pointer.lt = nowSec();
        G.path.drawing = true; G.path.pts = []; G.path.len = 0;
        addPathPoint(p);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 非対応でも続行 */ }
        return;
      }
      if (teppeiReady() && inBtn(btn.teppei, p, 1.2)) {
        if (pathReady()) enterPath();   // 満タン: 道を描く（描かなければおまかせ）
        else callTeppei();
        return;
      }
    }
    if (mode === 'play') {   // この押下が短ければ鈴（ボタン上・経路指定・ポーズ中は上で抜けている）
      bellTap = { id: e.pointerId, x: p.x, y: p.y, t: nowSec(), touch: !isMouse, cancel: inBtn(btn.teppei, p, 1.2) };
    }
    if (isMouse && mode !== 'play') {
      // 題字・結果はマウスならクリックで進む（動かすだけでは進まない）
      if (mode === 'title' || (mode === 'over' && modeT > 1.2)) startGame();
      return;
    }
    if (pointer.hover) {
      if (isMouse) {   // 動かしていた筆をそのまま押下の一筆にする（二重に斬らない）
        pointer.hover = false;
        pointer.id = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 非対応でも続行 */ }
        return;
      }
      endPointer();   // マウスの筆を置いて、指・ペンを優先
    }
    pointer.active = true;
    pointer.hover = false;
    pointer.id = e.pointerId;
    startStroke(p, nowSec());
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 非対応でも続行 */ }
  }

  // マウスは押さなくても動かすだけで筆が下りている
  function onHoverMove(e) {
    if (mode !== 'play' || !G || paused || G.path) {
      if (pointer.active && pointer.hover) endPointer();
      return;
    }
    var p = evPos(e), now = nowSec();
    if (!pointer.active) {
      pointer.active = true; pointer.hover = true; pointer.ignore = false; pointer.id = e.pointerId;
      startStroke(p, now);
      return;
    }
    if (e.pointerId !== pointer.id) return;
    e.preventDefault();
    strokeMove(p, now);
  }

  function onMove(e) {
    var lp = evPos(e);
    lastPtr.x = lp.x; lastPtr.y = lp.y;
    if (e.pointerType === 'mouse' && !(pointer.active && !pointer.hover)) { onHoverMove(e); return; }
    if (!pointer.active || pointer.hover || e.pointerId !== pointer.id) return;
    e.preventDefault();
    if (pointer.ignore) return;
    var p = evPos(e), now = nowSec();
    if (mode === 'play' && G && G.path && !paused) { addPathPoint(p); return; }
    strokeMove(p, now);
  }

  // 筆の移動 1 回ぶん（押下・マウス常時で共通）
  function strokeMove(p, now) {
    var dx = p.x - pointer.x, dy = p.y - pointer.y, len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    if (bellTapPending(p, now)) return;   // 短いタップの間（タッチ・ペン）は斬らない
    var speed = len / Math.max(0.008, now - pointer.lt) / U;
    var x1 = pointer.x, y1 = pointer.y;
    pointer.x = p.x; pointer.y = p.y; pointer.lt = now;
    if (mode === 'play' && G && !paused) {
      if (bladeLock > 0) { trail.length = 0; loopPts.length = 0; return; }   // 弾かれ中は斬れない（明ければ自動で復帰）
      chargeMoved();
    }
    trail.push({ x: p.x, y: p.y, t: now });
    if (trail.length > 64) trail.shift();
    if (paused) return;
    var power = mode === 'play' && charge.power > 0;
    var fast = speed >= CFG.MIN_SLASH_SPEED || power;
    if (pointer.hover && !fast) endHoverStroke();   // 遅い動きは一筆の区切り
    if (fast) {
      stroke.len += len;
      if (now - lastSlashSfx > 0.13) {
        lastSlashSfx = now;
        sfx('slash', { power: power ? 1 : clamp(speed / 400, 0.15, 1) });
      }
    }
    if (mode === 'play') {
      if (fast) sliceSegment(x1, y1, p.x, p.y, power);
      if (bladeLock <= 0 && G && !G.path) loopAdd(p.x, p.y, now);
    } else if (fast && stroke.len >= CFG.START_STROKE_LEN * U) {
      // 題字・結果の画面は「斬って」進む（マウスはクリック）
      if (mode === 'title' || (mode === 'over' && modeT > 1.2)) {
        fx('slashMark', trail[0].x, trail[0].y, p.x, p.y, { width: 1.6 * U, color: COL.washi });
        stroke.len = 0;
        startGame();
      }
    }
  }

  function onUp(e) {
    if (!pointer.active || pointer.hover || e.pointerId !== pointer.id) return;
    var wasPath = mode === 'play' && G && G.path && G.path.drawing && !pointer.ignore;
    var tap = bellTap;
    bellTap = null;
    endPointer();
    if (tap && tap.id === e.pointerId && e.type === 'pointerup' && !wasPath) {   // 短いクリック / タップ → 鈴
      var up = evPos(e), tn = nowSec();
      if (tn - tap.t <= CFG.BELL_TAP_TIME && !tap.cancel && Math.hypot(up.x - tap.x, up.y - tap.y) <= CFG.BELL_TAP_MOVE * U) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
        ringBell(tap.x, tap.y);
        return;
      }
    }
    if (wasPath) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      if (e.type === 'pointercancel') { G.path.drawing = false; G.path.pts = []; G.path.len = 0; }
      else finishPath();   // 離すと出発（ただの点ならおまかせ）
      return;
    }
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
  }

  // カーソルが画面の外へ出たらマウスの筆を置く
  function onLeave(e) {
    if (e.pointerType === 'mouse' && pointer.active && pointer.hover) endPointer();
  }

  function onKey(e) {
    if (e.repeat) return;
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || e.code === 'Space') {
      e.preventDefault();
      initAudio();
      if (mode === 'play') {
        if (paused) setPaused(false); else callTeppei();
      }
    } else if (k === 'r' || k === 'R') {
      if (mode === 'play') { initAudio(); enterPath(); }
    } else if (k === 'b' || k === 'B') {
      if (bellAvailable()) {
        initAudio();
        var bx = lastPtr.x >= 0 ? lastPtr.x : W / 2, by = lastPtr.x >= 0 ? lastPtr.y : H * 0.4;
        ringBell(clamp(bx, 0, W), clamp(by, 0, H));
      }
    } else if (k === 'h' || k === 'H') {
      if (mode === 'play') { initAudio(); setPaused(!paused); }
    } else if (k === 'p' || k === 'P' || k === 'Escape') {
      if (mode === 'play') { initAudio(); setPaused(!paused); }
    } else if (k === 'm' || k === 'M') {
      initAudio();
      toggleMute();
    } else if (k === 'Enter') {
      initAudio();
      if (mode === 'title' || (mode === 'over' && modeT > 1.2)) startGame();
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('lostpointercapture', onUp);
  window.addEventListener('keydown', onKey);
  // スクロール・ズーム・長押しメニューを止める
  var stop = function (e) { e.preventDefault(); };
  ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'dblclick', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (n) {
    document.addEventListener(n, stop, { passive: false });
  });
  window.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) setPaused(true);
    lastT = 0;
  });
  window.addEventListener('blur', function () { setPaused(true); });

  // 確認用の読み取り窓口
  window.IchiGame = {
    state: function () {
      return {
        mode: mode, paused: paused,
        score: G ? G.score : 0, ichi: G ? G.ichi : 0, kana: G ? G.kana : 0,
        life: G ? G.life : 0, wave: G ? G.wave : 0, combo: G ? G.combo : 0,
        gauge: G ? G.gauge : 0, pathMode: !!(G && G.path), dashing: !!(G && G.dash), enemies: G ? G.enemies.length : 0, best: best,
        tip: G && G.tip ? G.tip.text : '',
        charge: { charging: !!(charge.on && charge.still >= CFG.CHARGE_SHOW && !charge.ready && charge.power <= 0), ready: charge.ready, power: charge.power > 0 },
        types: G ? G.enemies.map(function (e) { return e.type; }) : [],
        sei: !!(G && G.sei), bladeLock: bladeLock,
        btn: { mute: btn.mute, pause: btn.pause, help: btn.help, teppei: btn.teppei }, muted: !!au('isMuted'),
        bellCd: G ? G.bellCd : 0, invincible: G ? +G.invT.toFixed(2) : 0, walker: G && G.walker ? { x: Math.round(G.walker.x), y: Math.round(G.walker.y), mode: G.walker.mode } : null, W: W, H: H, U: U, willow: { x: willow.cx, y: willow.cy, r: willow.cr },
        hover: pointer.hover, pointerActive: pointer.active, comboTimer: G ? G.comboTimer : 0, kanaLost: !!(G && G.kanaLost),
        list: G ? G.enemies.map(function (e) { return { type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, stun: +e.stun.toFixed(2), phase: e.phase || '', hold: e.hold, r: e.r, entered: e.entered, pull: !!e.pull, bx: Math.round(e.bx), by: Math.round(e.by) }; }) : []
      };
    },
    // 確認用（play 中のみ有効）
    debug: {
      spawn: function (type, x, y) {
        if (mode !== 'play' || !G || !CFG.TYPES[type]) return null;
        if (x === undefined || y === undefined) { var p = edgePoint(CFG.TYPES[type].r * U); x = p.x; y = p.y; }
        var e = makeEnemy(type, x, y, waveSpeed());
        G.enemies.push(e);
        return e;
      },
      setWave: function (n) {
        if (mode !== 'play' || !G) return;
        G.wave = n - 1;
        startWave();
      },
      setGauge: function (n) {
        if (mode !== 'play' || !G) return;
        G.gauge = clamp(Math.round(n), 0, CFG.TEPPEI_GAUGE_MAX);
      },
      god: function (on) {
        if (mode !== 'play' || !G) return;
        G.god = !!on;
      },
      // 一柳を 1 回発動（big: true で大きい演出を強制）
      ichi: function (big) {
        if (mode !== 'play' || !G) return;
        triggerIchiyanagi(!!big);
      },
      // 五文字を n 個点けた状態にする（コンボも継続中にする）
      setKana: function (n) {
        if (mode !== 'play' || !G) return;
        G.kana = clamp(Math.floor(n), 0, 4);
        G.combo = Math.max(G.combo, G.kana); G.comboTimer = CFG.COMBO_TIME;
      },
      // 鈴のクールダウンを即終わらせる
      bellReady: function () {
        if (mode !== 'play' || !G) return;
        G.bellCd = 0;
      },
      // 哲平を (x, y) に歩かせる（確認用。dir: 1 右 / -1 左）
      walker: function (x, y, dir) {
        if (mode !== 'play' || !G) return;
        var r = CFG.TEPPEI_R * U;
        G.walker = { x: x, y: y, r: r, dir: dir < 0 ? -1 : 1, t: 0, mode: 'walk', ouch: 0 };
      },
      clearEnemies: function () {
        if (mode !== 'play' || !G) return;
        G.enemies.length = 0; G.toSpawn = 0; G.bossTimer = -1;
        G.waveState = 'gap'; G.waveTimer = 1e9;   // 次の波を止める（確認用）
      },
      setIchi: function (n) {
        if (mode !== 'play' || !G) return;
        G.ichi = Math.max(0, Math.floor(n));
      },
      // 柳に n ダメージ（god 中でも通る）
      hurt: function (n) {
        if (mode !== 'play' || !G) return;
        var g = G.god;
        G.god = false;
        hurtWillow(n || 1, { x: willow.cx + 6 * U, y: willow.cy - 10 * U, r: 3 * U });
        G.god = g;
      },
      gameOver: function () {
        if (mode !== 'play' || !G) return;
        gameOver();
      }
    }
  };

  resize();
  requestAnimationFrame(frame);
})();
