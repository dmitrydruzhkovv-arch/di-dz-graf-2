/* ДЗ «Графики · Урок 2 — Приручи параболу» (квадратичная y=ax²+bx+c + вершинная (x−h)²+k).
   Формат: ОДНА КАРТОЧКА НА ЭКРАН, движение только вперёд.
   Данные: data.json (Методист). Математику не менять — только интерфейс и проверка.

   Шасси (финал, отчёт #38, прогресс, «Заново», время) — из эталона dz_graf_urok1.
   Механика темы — своя: разгонная песочница-ползунки (a → a·b·c → вершина), затем задачи.

   «ПИАНИНО» (новое, правка D 09.07): каждый кликабельный элемент звучит приятной нотой
   (синтез Web Audio, пентатоника → любые нажатия гармоничны). Верный ответ — победный
   аккорд + вспышка. Неверный — один резкий диссонанс, выделяется из всех сладких нот. */

'use strict';

// ── УТИЛИТЫ ──────────────────────────────────────────────────────────────────

function makeFrac(n, d) {
  return `<span class="frac lk-mono"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
}
function fmtInline(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, (_, s) => `<span class="lk-hl">${s}</span>`)
    .replace(/`([^`]+)`/g,     (_, s) => `<span class="lk-mono">${s}</span>`)
    .replace(/([−-]?\d+)\/(\d+)/g, (_, n, d) => makeFrac(n, d));
}
function fmtOpt(text) { return fmtInline(String(text).replace(/\*\*(.+?)\*\*/g, '$1')); }
function renderFeedback(fb) {
  const parts = Array.isArray(fb) ? fb : String(fb).split('\n');
  return parts.map(p => p.trim()).filter(Boolean)
    .map(p => `<p class="fb-p">${fmtInline(p)}</p>`).join('');
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function parseNum(s) {
  s = String(s).trim().replace(/\s/g, '').replace(/−/g, '-').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return parseFloat(s);
}
function fmtNum(v) { return String(v).replace('-', '−'); }
function fmtSliderVal(v) {
  const s = Math.round(v * 10) / 10;
  let str = Number.isInteger(s) ? String(s) : s.toFixed(1);
  return str.replace('.', ',').replace('-', '−');
}
function fracOrInt(v) {
  const neg = v < 0, av = Math.abs(v);
  if (Number.isInteger(av)) return (neg ? '−' : '') + av;
  const num = Math.round(av * 2);
  return (neg ? '−' : '') + makeFrac(num, 2);
}

const KEYS = ['А', 'Б', 'В', 'Г', 'Д'];
const MG_COLORS = ['mp-pair-0', 'mp-pair-1', 'mp-pair-2', 'mp-pair-3'];

// ── ПИАНИНО: приятный звук на каждый тап + резкий на ошибку ───────────────────
// Синтез Web Audio: нет загрузки файлов, нет CSP-сюрпризов, пентатоника всегда
// звучит музыкально. Диссонанс на ошибку намеренно «чужой» среди сладких нот.
const Piano = (() => {
  let ctx = null, noteIdx = 0;
  // C-мажорная пентатоника через ~1.5 октавы: любые ноты вместе — гармония.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // Мягкий щипок (музыкальная шкатулка): тон + октава, быстрая атака, экспоненциальный спад.
  function pluck(freq, dur, gain) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    master.connect(c.destination);
    [[freq, 'triangle', 1], [freq * 2, 'sine', 0.32]].forEach(([f, ty, g]) => {
      const o = c.createOscillator(), og = c.createGain();
      o.type = ty; o.frequency.setValueAtTime(f, t);
      og.gain.setValueAtTime(g, t);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    });
  }
  return {
    wake() { ensure(); },
    tap() {                                   // клик по любому интерактиву — следующая нота
      const f = SCALE[noteIdx % SCALE.length];
      noteIdx = (noteIdx + 1) % SCALE.length;
      pluck(f, 0.4, 0.12);
    },
    win() {                                   // верный ответ — восходящий аккорд до-ми-соль-до
      noteIdx = 0;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => setTimeout(() => pluck(f, 0.6, 0.15), i * 70));
    },
    wrong() {                                 // неверный — резкий диссонанс с падением высоты
      const c = ensure(); if (!c) return;
      noteIdx = 0;
      const t = c.currentTime, g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      g.connect(c.destination);
      [[196, 0], [196, 13]].forEach(([f, det]) => {         // малая секунда, расстроено
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f + det, t);
        o.frequency.exponentialRampToValueAtTime((f + det) * 0.55, t + 0.42);
        o.connect(g); o.start(t); o.stop(t + 0.5);
      });
    },
    final() { SCALE.forEach((f, i) => setTimeout(() => pluck(f, 0.55, 0.13), i * 95)); }
  };
})();

// Звук-момент из бренд-кита (mp3): верно/неверно/финал — как на dz_graf_urok1.
// Пианино оставляем ТОЛЬКО на тапы по кнопкам; победная/ошибка/финал — mp3 (просьба D 10.07).
function playSound(id) {
  const a = document.getElementById(id);
  if (!a) return;
  try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
}
// Разблокировка звука — в общем движке (hw-core.js): будит НА ЗАГЛУШЁННОМ звуке.
// Раньше будили обычным play() → мелодии успевали прозвучать на первом же тапе.
function unlockAudio() { HwCore.unlockAudio(['snd-win', 'snd-lose', 'snd-final']); }

// Приятная нота на тап по любому интерактиву/кнопке. ЕДИНСТВЕННОЕ исключение —
// «Проверить»: у неё свой звук верно/неверно, пианино на ней = двойной звук (D 10.07).
const TAP_SEL = 'button, .lk-opt, .tf-btn, .sign-btn, .tx-opt, .mg-item, .slbtn, .flip-btn, .rp-dot, [data-tap]';
document.addEventListener('pointerdown', e => {
  unlockAudio();
  const el = e.target.closest(TAP_SEL);
  if (!el || el.disabled || el.classList.contains('is-locked')) return;
  if (el.classList.contains('check-btn')) return;   // у «Проверить» свой звук — без пианино
  Piano.wake();
  Piano.tap();
}, true);

// ── БУМ-ЭФФЕКТ: вспышка фона-ромбов + звук ────────────────────────────────────
function lkFlash(el) { if (!el) return; el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on'); }
function boom(correct) {
  if (correct) { lkFlash(document.getElementById('lk-fx-ok')); playSound('snd-win'); }
  else         { lkFlash(document.getElementById('lk-fx-bad')); playSound('snd-lose'); }
}
function cardReact(card, correct) {
  card.classList.remove('lk-card-win', 'lk-card-shake'); void card.offsetWidth;
  card.classList.add(correct ? 'lk-card-win' : 'lk-card-shake');
}
function shake(btn) {
  btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
  btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once: true });
}

// ═══════════ КООРДИНАТНАЯ ПЛОСКОСТЬ (SVG, настраиваемое окно) ═══════════
// Крупная (требование Ди): клетки большие, окно под конкретную параболу, ≥9 клеток.

const C_INK = '#eef0ff', C_MUTED = '#9aa0c8', C_STAR = '#D946EF', C_OK = '#34D399';
const C_LINE = '#6366F1', C_GHOST = '#cfc7ee', C_VERT = '#A855F7', MONO = "'JetBrains Mono',monospace";
const DEF_WIN = { xmin: -6, xmax: 6, ymin: -7, ymax: 9 };
let SVGN = 0;

function mkView(win) {
  const w = win || DEF_WIN;
  const xspan = w.xmax - w.xmin, yspan = w.ymax - w.ymin;
  const cell = Math.min(28, 300 / xspan);
  const pad = 18;
  const plotW = xspan * cell, plotH = yspan * cell;
  const X = x => pad + (x - w.xmin) * cell;
  const Y = y => pad + (w.ymax - y) * cell;
  return { w, cell, pad, xspan, yspan, plotW, plotH, W: plotW + 2 * pad, H: plotH + 2 * pad, X, Y };
}

function svgDefs(id, v) {
  return `<defs>` +
    `<clipPath id="clip-${id}"><rect x="${v.pad}" y="${v.pad}" width="${v.plotW}" height="${v.plotH}" rx="10"/></clipPath>` +
    `<filter id="glow-${id}" x="-40%" y="-40%" width="180%" height="180%">` +
      `<feGaussianBlur stdDeviation="2.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter></defs>`;
}

function gridMarkup(v, minimal) {
  const { w, X, Y, pad, plotW, plotH } = v;
  let s = `<rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" rx="10" fill="rgba(255,255,255,.028)" stroke="#2a2a4d" stroke-width="1"/>`;
  const grid = minimal ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.075)';
  for (let i = Math.ceil(w.xmin); i <= Math.floor(w.xmax); i++) {
    if (i === 0) continue;
    const gx = X(i).toFixed(1);
    s += `<line x1="${gx}" y1="${pad}" x2="${gx}" y2="${pad + plotH}" stroke="${grid}" stroke-width="1"/>`;
  }
  for (let j = Math.ceil(w.ymin); j <= Math.floor(w.ymax); j++) {
    if (j === 0) continue;
    const gy = Y(j).toFixed(1);
    s += `<line x1="${pad}" y1="${gy}" x2="${pad + plotW}" y2="${gy}" stroke="${grid}" stroke-width="1"/>`;
  }
  const ax = X(0).toFixed(1), ay = Y(0).toFixed(1), axCol = 'rgba(255,255,255,.42)';
  s += `<line x1="${pad}" y1="${ay}" x2="${pad + plotW}" y2="${ay}" stroke="${axCol}" stroke-width="1.6"/>`;
  s += `<line x1="${ax}" y1="${pad}" x2="${ax}" y2="${pad + plotH}" stroke="${axCol}" stroke-width="1.6"/>`;
  s += `<path d="M${pad + plotW},${ay} l-7,-4 l0,8 z" fill="${axCol}"/>`;
  s += `<path d="M${ax},${pad} l-4,7 l8,0 z" fill="${axCol}"/>`;
  if (!minimal) {
    s += `<text x="${pad + plotW - 3}" y="${(+ay - 7).toFixed(1)}" fill="${C_MUTED}" font-size="12" font-family="${MONO}" text-anchor="end">x</text>`;
    s += `<text x="${(+ax + 8).toFixed(1)}" y="${pad + 12}" fill="${C_MUTED}" font-size="12" font-family="${MONO}">y</text>`;
    s += `<text x="${(+ax - 6).toFixed(1)}" y="${(+ay + 14).toFixed(1)}" fill="${C_MUTED}" font-size="11" font-family="${MONO}" text-anchor="end">O</text>`;
    const xStep = v.xspan > 13 ? 2 : 1, yStep = v.yspan > 13 ? 2 : 1;
    for (let i = Math.ceil(w.xmin); i <= Math.floor(w.xmax); i++) {
      if (i === 0 || i % xStep !== 0) continue;
      s += `<text x="${X(i).toFixed(1)}" y="${(+ay + 15).toFixed(1)}" fill="${C_MUTED}" font-size="9.5" font-family="${MONO}" text-anchor="middle" opacity=".65">${fmtNum(i)}</text>`;
    }
    for (let j = Math.ceil(w.ymin); j <= Math.floor(w.ymax); j++) {
      if (j === 0 || j % yStep !== 0) continue;
      s += `<text x="${(+ax - 7).toFixed(1)}" y="${(Y(j) + 3.5).toFixed(1)}" fill="${C_MUTED}" font-size="9.5" font-family="${MONO}" text-anchor="end" opacity=".65">${fmtNum(j)}</text>`;
    }
  }
  return s;
}

function starPath(cx, cy, r) {
  let p = ''; const spikes = 5, inner = r * 0.44;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = (i % 2 === 0) ? r : inner;
    const ang = (Math.PI / spikes) * i - Math.PI / 2;
    p += (i === 0 ? 'M' : 'L') + (cx + Math.cos(ang) * rad).toFixed(1) + ',' + (cy + Math.sin(ang) * rad).toFixed(1);
  }
  return p + 'Z';
}

// Гладкая дуга параболы: частая выборка + кламп y, чтобы координаты не улетали.
function parabPath(v, a, b, c) {
  const { w, X, Y } = v;
  const step = (w.xmax - w.xmin) / 200;
  let d = '';
  for (let x = w.xmin; x <= w.xmax + 1e-9; x += step) {
    const y = clamp(a * x * x + b * x + c, w.ymin - 3, w.ymax + 3);
    d += (d ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(y).toFixed(1) + ' ';
  }
  return d.trim();
}
function lineAttrs(v, k, b) {
  // ВАЖНО: y НЕ зажимаем — иначе у крутых прямых (|k|>1) ломается наклон
  // (концы приезжают на границу, крутизна занижается). Обрезку делает clipPath.
  const y1 = k * v.w.xmin + b, y2 = k * v.w.xmax + b;
  return { x1: v.X(v.w.xmin).toFixed(1), y1: v.Y(y1).toFixed(1),
           x2: v.X(v.w.xmax).toFixed(1), y2: v.Y(y2).toFixed(1) };
}

// Статичный график (параболы / прямые / точки / звёзды / тап-точки на Ox).
function buildGraph(opts) {
  const v = mkView(opts.win);
  const id = ++SVGN, min = !!opts.minimal;
  let inner = svgDefs(id, v) + gridMarkup(v, min);
  inner += `<g clip-path="url(#clip-${id})">`;
  (opts.parabs || []).forEach(p => {
    inner += `<path d="${parabPath(v, p.a, p.b, p.c)}" fill="none" stroke="${p.color || C_LINE}" stroke-width="${min ? 3 : 3.4}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${id})"/>`;
  });
  (opts.lines || []).forEach(l => {
    const a = lineAttrs(v, l.k, l.b);
    inner += `<line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" stroke="${l.color || C_LINE}" stroke-width="${min ? 3 : 3.4}" stroke-linecap="round" filter="url(#glow-${id})"/>`;
  });
  inner += `</g>`;
  (opts.stars || []).forEach(st => {
    inner += `<path d="${starPath(v.X(st.x), v.Y(st.y), 9)}" fill="${st.on ? C_OK : C_STAR}" stroke="#0A0610" stroke-width="1" filter="url(#glow-${id})"/>`;
  });
  (opts.points || []).forEach(p => {
    const cx = v.X(p.x), cy = v.Y(p.y);
    inner += `<path d="M${cx},${v.Y(0)} L${cx},${cy}" stroke="rgba(168,85,247,.4)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    inner += `<path d="M${v.X(0)},${cy} L${cx},${cy}" stroke="rgba(168,85,247,.4)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    inner += `<circle cx="${cx}" cy="${cy}" r="6" fill="#A855F7" stroke="#fff" stroke-width="1.5" filter="url(#glow-${id})"/>`;
  });
  (opts.marks || []).forEach(m => {
    const cx = v.X(m.x), cy = v.Y(m.y);
    inner += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${C_STAR}" stroke="#0A0610" stroke-width="1"/>`;
    if (m.label) inner += `<text x="${cx}" y="${(cy - 9).toFixed(1)}" fill="${C_INK}" font-size="10.5" font-family="${MONO}" text-anchor="middle">${m.label}</text>`;
  });
  const cls = 'graph-svg' + (opts.sizeClass ? (' ' + opts.sizeClass) : '');
  return `<div class="graph-wrap"><svg class="${cls}" viewBox="0 0 ${v.W.toFixed(0)} ${v.H.toFixed(0)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="координатная плоскость">${inner}</svg></div>`;
}

// ═══════════ ДВИЖОК ЖИВОЙ ПАРАБОЛЫ (ползунки, 3 профиля) ═══════════
// profile: 'a' (одна ручка a) · 'abc' (a,b,c) · 'vertex' (h,k,флип).
// Многораундовый: ловим призрак-цель. onWin() — один раз на последнем раунде.

function createParabEngine(host, cfg, onWin) {
  const id = ++SVGN;
  const v = mkView(cfg.win || DEF_WIN);
  const prof = cfg.profile;
  const targets = cfg.rounds;
  let roundIdx = 0, won = false, advancing = false, lastMoved = prof === 'vertex' ? 'h' : (prof === 'abc' ? 'c' : 'a');

  const st = prof === 'a'      ? { a: 1 }
           : prof === 'abc'    ? { a: 1, b: 0, c: 0 }
           :                     { h: 0, k: 0, flip: false };

  const svg =
    `<svg class="graph-svg" viewBox="0 0 ${v.W.toFixed(0)} ${v.H.toFixed(0)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="живая парабола">` +
      svgDefs(id, v) + gridMarkup(v, false) +
      `<g clip-path="url(#clip-${id})">` +
        `<path id="ge-ghost-${id}" d="M0,0" fill="none" stroke="${C_GHOST}" stroke-width="2.4" stroke-dasharray="6 6" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>` +
        `<path id="ge-parab-${id}" d="M0,0" fill="none" stroke="${C_LINE}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${id})"/>` +
      `</g>` +
      `<g id="ge-mark-${id}"></g>` +
    `</svg>`;

  host.innerHTML =
    `<div class="ge">` +
      `<div class="ge-formula" id="ge-formula-${id}"></div>` +
      `<div class="graph-wrap">${svg}</div>` +
      `<div class="ge-hint" id="ge-hint-${id}"></div>` +
      `<div class="ge-sliders" id="ge-sliders-${id}"></div>` +
    `</div>`;

  const parabEl  = host.querySelector(`#ge-parab-${id}`);
  const ghostEl  = host.querySelector(`#ge-ghost-${id}`);
  const markG    = host.querySelector(`#ge-mark-${id}`);
  const formulaEl= host.querySelector(`#ge-formula-${id}`);
  const roundEl  = document.getElementById('task-round');   // «Раунд N/M» — в шапке карточки
  const hintEl   = host.querySelector(`#ge-hint-${id}`);
  const sliders  = host.querySelector(`#ge-sliders-${id}`);

  // текущие коэффициенты параболы под профиль
  function coeffs() {
    if (prof === 'a')   return { a: st.a, b: 0, c: 0 };
    if (prof === 'abc') return { a: st.a, b: st.b, c: st.c };
    const s = st.flip ? -1 : 1;                       // (x−h)²+k → x² −2h x + (h²+k)
    return { a: s, b: s * -2 * st.h, c: s * (st.h * st.h) + st.k };
  }
  function targetCoeffs(t) {
    if (prof === 'a')   return { a: t.a, b: 0, c: 0 };
    if (prof === 'abc') return { a: t.a, b: t.b, c: t.c };
    return { a: 1, b: -2 * t.h, c: t.h * t.h + t.k };
  }

  // ── формулы ──
  function aFormula(hl) {
    return `y = <span class="${hl === 'a' ? 'lk-hl' : ''}">${fracOrInt(st.a)}</span>·x²`;
  }
  function coefTerm(val, varTxt, key, hl) {
    const sign = val < 0 ? '−' : '+';
    const cls = hl === key ? 'lk-hl' : '';
    const num = key === 'a' ? fracOrInt(Math.abs(val)) : Math.abs(val);
    return ` ${sign} <span class="${cls}">${num}</span>${varTxt}`;
  }
  function abcFormula(hl) {
    const aLead = `<span class="${hl === 'a' ? 'lk-hl' : ''}">${fracOrInt(st.a)}</span>·x²`;
    return `y = ${aLead}${coefTerm(st.b, 'x', 'b', hl)}${coefTerm(st.c, '', 'c', hl)}`;
  }
  function vertexFormula(hl) {
    const s = st.flip ? '−' : '';
    let inside = 'x';
    if (st.h > 0) inside = `x − <span class="${hl === 'h' ? 'lk-hl' : ''}">${st.h}</span>`;
    else if (st.h < 0) inside = `x + <span class="${hl === 'h' ? 'lk-hl' : ''}">${Math.abs(st.h)}</span>`;
    let kPart = '';
    if (st.k > 0) kPart = ` + <span class="${hl === 'k' ? 'lk-hl' : ''}">${st.k}</span>`;
    else if (st.k < 0) kPart = ` − <span class="${hl === 'k' ? 'lk-hl' : ''}">${Math.abs(st.k)}</span>`;
    return `y = ${s}(${inside})²${kPart}`;
  }
  function formula(hl) {
    return prof === 'a' ? aFormula(hl) : prof === 'abc' ? abcFormula(hl) : vertexFormula(hl);
  }

  function vertexOf(co) {
    if (Math.abs(co.a) < 1e-9) return null;
    const vx = -co.b / (2 * co.a);
    return { x: vx, y: co.a * vx * vx + co.b * vx + co.c };
  }

  function setGhost() {
    const co = targetCoeffs(targets[roundIdx]);
    ghostEl.setAttribute('d', parabPath(v, co.a, co.b, co.c));
  }
  function drawMarks() {
    const co = coeffs();
    let m = '';
    if (prof === 'vertex') {                          // звезда-цель
      const t = targets[roundIdx], on = st.h === t.h && st.k === t.k && !st.flip;
      m += `<path d="${starPath(v.X(t.h), v.Y(t.k), 10)}" fill="${on ? C_OK : C_STAR}" stroke="#0A0610" stroke-width="1" filter="url(#glow-${id})"/>`;
    }
    if (prof === 'abc') {                              // точка на Oy = c
      const cy = v.Y(clamp(st.c, v.w.ymin, v.w.ymax));
      m += `<circle cx="${v.X(0).toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${C_STAR}" stroke="#0A0610" stroke-width="1"/>`;
    }
    const vx = vertexOf(co);                           // вершина-точка ученика
    if (vx && vx.x >= v.w.xmin && vx.x <= v.w.xmax && vx.y >= v.w.ymin && vx.y <= v.w.ymax) {
      m += `<circle cx="${v.X(vx.x).toFixed(1)}" cy="${v.Y(vx.y).toFixed(1)}" r="5" fill="${C_VERT}" stroke="#fff" stroke-width="1.5" filter="url(#glow-${id})"/>`;
    }
    markG.innerHTML = m;
  }

  function hit() {
    const t = targets[roundIdx];
    if (prof === 'a')   return st.a === t.a;
    if (prof === 'abc') return st.a === t.a && st.b === t.b && st.c === t.c;
    return st.h === t.h && st.k === t.k && !st.flip;
  }

  function redraw() {
    const co = coeffs();
    parabEl.setAttribute('d', parabPath(v, co.a, co.b, co.c));
    // Обёртка в один span: контейнер .ge-formula — flex, и он обрезал бы хвостовой
    // пробел у куска «y = » (=1 слипалось). Один флекс-элемент → пробелы сохраняются.
    formulaEl.innerHTML = '<span class="ge-fx">' + formula(lastMoved) + '</span>';
    drawMarks();
    // пасхалка a=0 (только профиль a): парабола распрямилась в прямую
    if (prof === 'a' && cfg.easter && st.a === 0 && !won) {
      hintEl.className = 'ge-hint'; hintEl.innerHTML = fmtInline(cfg.easter);
    }
    maybeWin();
  }

  function maybeWin() {
    if (won || advancing || !hit()) return;
    boom(true);
    if (roundIdx < targets.length - 1) {
      advancing = true;
      hintEl.className = 'ge-hint win'; hintEl.textContent = 'Есть! ✨ Следующий призрак…';
      setTimeout(() => { advancing = false; roundIdx++; loadRound(); redraw(); }, 850);
    } else {
      won = true;
      hintEl.className = 'ge-hint win'; hintEl.textContent = 'Поймал! ✨';
      onWin();
    }
  }

  function loadRound() {
    setGhost();
    if (roundEl) roundEl.textContent = `раунд ${roundIdx + 1}/${targets.length}`;
    hintEl.className = 'ge-hint';
    hintEl.innerHTML = fmtInline(targets[roundIdx].note || 'Наведи свою параболу на призрак.');
  }

  // ── ползунки ──
  function sliderRow(key, name, min, max, step) {
    return `<div class="slrow" data-key="${key}">` +
      `<span class="sl-name">${name}</span>` +
      `<button class="slbtn" data-act="dec" aria-label="меньше">−</button>` +
      `<input type="range" class="sl" min="${min}" max="${max}" step="${step}" value="${st[key]}">` +
      `<button class="slbtn" data-act="inc" aria-label="больше">+</button>` +
      `<span class="slval">${fmtSliderVal(st[key])}</span>` +
    `</div>`;
  }
  const mono = t => `<span class="lk-mono">${t}</span>`;
  let slHTML = '';
  if (prof === 'a') slHTML += sliderRow('a', `Ветви ${mono('a')}`, -3, 3, 0.5);
  else if (prof === 'abc') {
    slHTML += sliderRow('a', `Ветви ${mono('a')}`, -2, 2, 0.5);
    slHTML += sliderRow('b', `↔️ Вбок ${mono('b')}`, -6, 6, 1);
    slHTML += sliderRow('c', `🛗 Высота ${mono('c')}`, -8, 8, 1);
  } else {
    slHTML += sliderRow('h', `↔️ Вбок ${mono('h')}`, -5, 5, 1);
    slHTML += sliderRow('k', `🛗 Вверх ${mono('k')}`, -5, 5, 1);
    slHTML += `<button class="flip-btn" data-key="flip" type="button"><span class="fb-ico">🔀</span> <span class="flip-lbl">ветви вверх ∪</span></button>`;
  }
  sliders.innerHTML = slHTML;

  sliders.querySelectorAll('.slrow').forEach(row => {
    const key = row.dataset.key; if (!key) return;
    const range = row.querySelector('input[type=range]');
    const valEl = row.querySelector('.slval');
    if (!range) return;
    function sync() { st[key] = +range.value; lastMoved = key; valEl.textContent = fmtSliderVal(+range.value); redraw(); }
    range.addEventListener('input', sync);
    row.querySelectorAll('.slbtn').forEach(btn => btn.addEventListener('click', () => {
      const step = +range.step || 1, dir = btn.dataset.act === 'inc' ? 1 : -1;
      range.value = clamp(Math.round((+range.value + dir * step) * 100) / 100, +range.min, +range.max);
      sync();
    }));
  });
  const flipBtn = sliders.querySelector('.flip-btn');
  if (flipBtn) flipBtn.addEventListener('click', () => {
    st.flip = !st.flip; lastMoved = 'flip';
    flipBtn.querySelector('.flip-lbl').textContent = st.flip ? 'ветви вниз ∩' : 'ветви вверх ∪';
    redraw();
  });

  loadRound();
  redraw();
}

// ═══════════ МЕХАНИКА — СОЕДИНИ (прямые/параболы) ═══════════

function buildMatch(task, kind) {
  const right = task._right || (task._right = shuffle(task.pairs.map((p, i) => ({ ...p, origIdx: i }))));
  const draw = kind === 'parab'
    ? p => buildGraph({ win: task.win, parabs: [{ a: p.a, b: p.b, c: p.c }], minimal: true, sizeClass: 'sm' })
    : p => buildGraph({ win: task.win, lines: [{ k: p.k, b: p.b }], minimal: true, sizeClass: 'sm' });
  const leftCol = task.pairs.map((p, i) =>
    `<div class="mg-item formula" data-side="left" data-idx="${i}">${fmtInline('`' + p.formula + '`')}</div>`).join('');
  const rightCol = right.map(p =>
    `<div class="mg-item graph" data-side="right" data-orig="${p.origIdx}">${draw(p)}</div>`).join('');
  return `<div class="mg-grid">
    <div class="mg-col"><div class="mg-col-label">формула</div>${leftCol}</div>
    <div class="mg-col"><div class="mg-col-label">график</div>${rightCol}</div>
  </div>`;
}
function initMatch(task, card) {
  const state = { sel: null, pairs: {} };
  function setNum(el, n) {
    if (!el) return;
    let b = el.querySelector('.mg-num');
    if (n === null) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'mg-num'; el.appendChild(b); }
    b.textContent = n;
  }
  function freeNum() { const used = new Set(Object.values(state.pairs).map(p => p.n)); let n = 1; while (used.has(n)) n++; return n; }
  function pair(li, ro) {
    Object.keys(state.pairs).forEach(k => { if (+k !== li && state.pairs[k].ro === ro) delete state.pairs[k]; });
    if (state.pairs[li]) state.pairs[li].ro = ro; else state.pairs[li] = { ro, n: freeNum() };
  }
  function apply() {
    card.querySelectorAll('.mg-item').forEach(el => { MG_COLORS.forEach(c => el.classList.remove(c)); el.classList.remove('mp-selected'); setNum(el, null); });
    Object.entries(state.pairs).forEach(([li, p]) => {
      const l = card.querySelector(`.mg-item[data-side="left"][data-idx="${li}"]`);
      const r = card.querySelector(`.mg-item[data-side="right"][data-orig="${p.ro}"]`);
      const ci = (p.n - 1) % MG_COLORS.length;
      if (l) l.classList.add(MG_COLORS[ci]); if (r) r.classList.add(MG_COLORS[ci]);
      setNum(l, p.n); setNum(r, p.n);
    });
    if (state.sel) {
      const s = state.sel.side === 'left'
        ? card.querySelector(`.mg-item[data-side="left"][data-idx="${state.sel.key}"]`)
        : card.querySelector(`.mg-item[data-side="right"][data-orig="${state.sel.key}"]`);
      if (s) s.classList.add('mp-selected');
    }
  }
  card.querySelectorAll('.mg-item').forEach(item => item.addEventListener('click', () => {
    if (item.classList.contains('is-locked')) return;
    const side = item.dataset.side;
    const key = side === 'left' ? +item.dataset.idx : +item.dataset.orig;
    if (state.sel && state.sel.side === side && state.sel.key === key) state.sel = null;
    else if (!state.sel || state.sel.side === side) state.sel = { side, key };
    else { const li = side === 'left' ? key : state.sel.key; const ro = side === 'right' ? key : state.sel.key; pair(li, ro); state.sel = null; }
    apply();
  }));
  return { check() {
    if (!task.pairs.every((_, i) => state.pairs[i] !== undefined)) return { ok: false };
    let allC = true; const wrong = [];
    task.pairs.forEach((p, li) => {
      const ro = state.pairs[li].ro, ok = ro === li;
      if (!ok) { allC = false; wrong.push(`${fmtInline('`' + p.formula + '`')} → не с тем графиком`); }
      const l = card.querySelector(`.mg-item[data-side="left"][data-idx="${li}"]`);
      const r = card.querySelector(`.mg-item[data-side="right"][data-orig="${ro}"]`);
      MG_COLORS.forEach(c => { if (l) l.classList.remove(c); if (r) r.classList.remove(c); });
      if (l) { l.classList.remove('mp-selected'); l.classList.add(ok ? 'is-correct' : 'is-wrong', 'is-locked'); }
      if (r) r.classList.add(ok ? 'is-correct' : 'is-wrong', 'is-locked');
    });
    card.querySelectorAll('.mg-item[data-side="right"]').forEach(el => el.classList.add('is-locked'));
    return { ok: true, correct: allC, wrong };
  }};
}

// ═══════════ МЕХАНИКА — ПРОЧИТАЙ ПАРАБОЛУ ═══════════

function buildReadParab(task) {
  return task.items.map((it, i) => `
    <div class="rl-item" id="rp-${task.id}-${i}">
      ${buildGraph({ win: it.win, parabs: [{ a: it.a, b: it.b, c: it.c }] })}
      <div class="rl-controls">
        <div class="rl-grp">
          <span class="rl-grp-lbl">ветви:</span>
          <button class="sign-btn" data-i="${i}" data-s="up">↑ ∪</button>
          <button class="sign-btn" data-i="${i}" data-s="down">↓ ∩</button>
        </div>
        <div class="rl-grp">
          <span class="rl-grp-lbl"><span class="lk-mono">c</span> =</span>
          <input class="num-field" type="text" inputmode="text" autocomplete="off" id="rp-c-${task.id}-${i}" placeholder="?">
        </div>
        <div class="rl-grp">
          <span class="rl-grp-lbl">нули:</span>
          <button class="sign-btn zero-btn" data-i="${i}" data-z="0">0</button>
          <button class="sign-btn zero-btn" data-i="${i}" data-z="1">1</button>
          <button class="sign-btn zero-btn" data-i="${i}" data-z="2">2</button>
        </div>
      </div>
    </div>`).join('');
}
function initReadParab(task, card) {
  const sign = {}, zeros = {};
  card.querySelectorAll('.sign-btn:not(.zero-btn)').forEach(btn => btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const i = btn.dataset.i; sign[i] = btn.dataset.s;
    card.querySelectorAll(`.sign-btn[data-i="${i}"]:not(.zero-btn)`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
  card.querySelectorAll('.zero-btn').forEach(btn => btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const i = btn.dataset.i; zeros[i] = +btn.dataset.z;
    card.querySelectorAll(`.zero-btn[data-i="${i}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
  return { check() {
    for (let i = 0; i < task.items.length; i++) {
      if (sign[i] === undefined || zeros[i] === undefined) return { ok: false };
      if (parseNum(card.querySelector(`#rp-c-${task.id}-${i}`).value) === null) return { ok: false };
    }
    let allC = true; const wrong = [];
    task.items.forEach((it, i) => {
      const cVal = parseNum(card.querySelector(`#rp-c-${task.id}-${i}`).value);
      const ok = sign[i] === it.ansSign && cVal === it.ansC && zeros[i] === it.ansZeros;
      if (!ok) { allC = false; wrong.push(`график ${i + 1}: ветви ${it.ansSign === 'up' ? '↑' : '↓'}, \`c=${fmtNum(it.ansC)}\`, нулей ${it.ansZeros}`); }
      card.querySelector(`#rp-${task.id}-${i}`).classList.add(ok ? 'is-correct' : 'is-wrong');
      card.querySelectorAll(`.sign-btn[data-i="${i}"]:not(.zero-btn)`).forEach(b => {
        b.classList.remove('selected');
        if (b.dataset.s === it.ansSign) b.classList.add('is-correct');
        else if (b.dataset.s === sign[i]) b.classList.add('is-wrong');
        b.disabled = true;
      });
      card.querySelectorAll(`.zero-btn[data-i="${i}"]`).forEach(b => {
        b.classList.remove('selected');
        if (+b.dataset.z === it.ansZeros) b.classList.add('is-correct');
        else if (+b.dataset.z === zeros[i]) b.classList.add('is-wrong');
        b.disabled = true;
      });
      card.querySelector(`#rp-c-${task.id}-${i}`).disabled = true;
    });
    return { ok: true, correct: allC, wrong };
  }};
}

// ═══════════ МЕХАНИКА — КОРНИ НА ПЛОСКОСТИ ═══════════
// Тап по точкам на оси Ox (поймать 2 пересечения) + два числовых добивочных ответа.

function buildRoots(task) {
  const v = mkView(task.win);
  const id = ++SVGN;
  let inner = svgDefs(id, v) + gridMarkup(v, false);
  inner += `<g clip-path="url(#clip-${id})"><path d="${parabPath(v, task.parab.a, task.parab.b, task.parab.c)}" fill="none" stroke="${C_LINE}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${id})"/></g>`;
  // тап-точки на Ox
  const dots = task.dotXs.map(x =>
    `<circle class="rp-dot" data-x="${x}" cx="${v.X(x).toFixed(1)}" cy="${v.Y(0).toFixed(1)}" r="8" fill="rgba(217,70,239,.28)" stroke="${C_STAR}" stroke-width="1.5" style="cursor:pointer"/>`).join('');
  inner += `<g id="rp-dots-${task.id}">${dots}</g>`;
  const svg = `<div class="graph-wrap"><svg class="graph-svg" id="rp-svg-${task.id}" viewBox="0 0 ${v.W.toFixed(0)} ${v.H.toFixed(0)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="парабола с осью x">${inner}</svg></div>`;
  return svg + `
    <p class="rp-tap-hint" id="rp-taphint-${task.id}">Тапни на оси <span class="lk-mono">x</span> обе точки пересечения.</p>
    <div class="rp-sub">
      <div class="tx-q">
        <div class="tx-q-text">${fmtInline(task.qCount.text)}</div>
        <div class="tx-q-input"><input class="num-field big-field" type="text" inputmode="numeric" autocomplete="off" id="rp-cnt-${task.id}" placeholder="?"></div>
      </div>
      <div class="tx-q">
        <div class="tx-q-text">${fmtInline(task.qMini.text)}</div>
        <div class="tx-q-input"><input class="num-field big-field" type="text" inputmode="numeric" autocomplete="off" id="rp-mini-${task.id}" placeholder="?"></div>
      </div>
    </div>`;
}
function initRoots(task, card) {
  const picked = new Set();
  card.querySelectorAll('.rp-dot').forEach(dot => dot.addEventListener('click', () => {
    if (dot.classList.contains('is-locked')) return;
    const x = +dot.dataset.x;
    if (picked.has(x)) { picked.delete(x); dot.setAttribute('fill', 'rgba(217,70,239,.28)'); dot.setAttribute('r', '8'); }
    else {
      if (picked.size >= 2) return;                 // не больше двух
      picked.add(x); dot.setAttribute('fill', C_VERT); dot.setAttribute('r', '9');
    }
  }));
  return { check() {
    if (picked.size !== 2) return { ok: false };
    const cnt = parseNum(card.querySelector(`#rp-cnt-${task.id}`).value);
    const mini = parseNum(card.querySelector(`#rp-mini-${task.id}`).value);
    if (cnt === null || mini === null) return { ok: false };
    const rootsOk = task.roots.every(r => picked.has(r)) && picked.size === task.roots.length;
    const cntOk = cnt === task.qCount.answer;
    const miniOk = mini === task.qMini.answer;
    const allC = rootsOk && cntOk && miniOk;
    const wrong = [];
    if (!rootsOk) wrong.push(`пересечения с осью x: **x=${fmtNum(task.roots[0])}** и **x=${fmtNum(task.roots[1])}**`);
    if (!cntOk) wrong.push(`${fmtInline(task.qCount.text)} → **${task.qCount.answer}**`);
    if (!miniOk) wrong.push(`${fmtInline(task.qMini.text)} → **${task.qMini.answer}**`);
    // подсветить точки
    card.querySelectorAll('.rp-dot').forEach(dot => {
      const x = +dot.dataset.x, isRoot = task.roots.includes(x);
      dot.classList.add('is-locked'); dot.style.cursor = 'default';
      if (isRoot) { dot.setAttribute('fill', C_OK); dot.setAttribute('stroke', '#0A0610'); dot.setAttribute('r', '9'); }
      else if (picked.has(x)) { dot.setAttribute('fill', 'rgba(244,63,94,.5)'); dot.setAttribute('stroke', '#F43F5E'); }
      else { dot.setAttribute('fill', 'rgba(255,255,255,.06)'); dot.setAttribute('stroke', 'rgba(255,255,255,.2)'); }
    });
    card.querySelector(`#rp-cnt-${task.id}`).disabled = true;
    card.querySelector(`#rp-mini-${task.id}`).disabled = true;
    return { ok: true, correct: allC, wrong };
  }};
}

// ═══════════ МЕХАНИКА — КОРЗИНЫ (дискриминант) ═══════════

function buildBins(task) {
  return task.items.map((it, i) => `
    <div class="tx-assign-row" id="bn-${task.id}-${i}">
      <span class="bn-eq">${fmtInline('`' + it.eq + '`')}</span>
      <div class="tx-opts">
        ${task.bins.map(b => `<button class="tx-opt" data-i="${i}" data-id="${b.id}">${fmtInline(b.text)}</button>`).join('')}
      </div>
    </div>`).join('');
}
function initBins(task, card) {
  const pick = {};
  card.querySelectorAll('.tx-opt').forEach(btn => btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const i = btn.dataset.i; pick[i] = btn.dataset.id;
    card.querySelectorAll(`.tx-opt[data-i="${i}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
  return { check() {
    for (let i = 0; i < task.items.length; i++) if (pick[i] === undefined) return { ok: false };
    let allC = true; const wrong = [];
    task.items.forEach((it, i) => {
      const ok = pick[i] === it.ans;
      if (!ok) { allC = false; wrong.push(`${fmtInline('`' + it.eq + '`')}: ${fmtInline(it.d)}`); }
      card.querySelector(`#bn-${task.id}-${i}`).classList.add(ok ? 'is-correct' : 'is-wrong');
      card.querySelectorAll(`.tx-opt[data-i="${i}"]`).forEach(b => {
        b.classList.remove('selected');
        if (b.dataset.id === it.ans) b.classList.add('is-correct');
        else if (b.dataset.id === pick[i]) b.classList.add('is-wrong');
        b.disabled = true;
      });
    });
    return { ok: true, correct: allC, wrong };
  }};
}

// ═══════════ МЕХАНИКА — ОДИНОЧНЫЙ ВЫБОР ═══════════

function buildSingleChoice(task) {
  const shown = task._shown || (task._shown = shuffle(task.options.map((o, i) => ({ ...o, _i: i }))));
  const q = task.quote ? `<div class="sc-quote">${fmtInline(task.quote)}</div>` : '';
  const opts = shown.map((o, i) =>
    `<button class="lk-opt" data-i="${i}"><span class="lk-key">${KEYS[i]}</span><span>${fmtOpt(o.text)}</span></button>`).join('');
  return q + `<div class="lk-opts">${opts}</div>`;
}
function initSingleChoice(task, card) {
  const shown = task._shown; let pick = null;
  card.querySelectorAll('.lk-opt').forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-locked')) return;
    pick = +btn.dataset.i;
    card.querySelectorAll('.lk-opt').forEach(b => { b.style.borderColor = ''; b.style.background = ''; });
    btn.style.borderColor = 'var(--lk-violet)'; btn.style.background = 'rgba(168,85,247,.10)';
  }));
  return { check() {
    if (pick === null) return { ok: false };
    const ok = shown[pick].correct; const wrong = [];
    if (!ok) { const right = shown.find(o => o.correct); wrong.push(`ты: ${fmtInline(shown[pick].text)} · верно: ${fmtInline(right.text)}`); }
    shown.forEach((o, i) => {
      const b = card.querySelector(`.lk-opt[data-i="${i}"]`); b.style.borderColor = ''; b.style.background = '';
      if (o.correct) b.classList.add('is-correct'); else if (i === pick) b.classList.add('is-wrong');
      b.classList.add('is-locked');
    });
    return { ok: true, correct: ok, wrong };
  }};
}

// ═══════════ МЕХАНИКА — ТРИ ЧИСЛА (бросок мяча) ═══════════

function buildTriple(task) {
  const rows = task.parts.map((p, i) => `
    <div class="num-row tri-row" id="tri-${task.id}-${i}">
      <span class="tri-key">${p.key})</span>
      <span class="tri-text">${fmtInline(p.text)}</span>
      <span class="tri-in"><input class="num-field big-field" type="text" inputmode="text" autocomplete="off" id="tri-in-${task.id}-${i}" placeholder="?"><span class="unit">${p.unit || ''}</span></span>
    </div>`).join('');
  return buildGraph({ win: task.win, parabs: [{ a: task.parab.a, b: task.parab.b, c: task.parab.c }], marks: task.marks }) + rows;
}
function initTriple(task, card) {
  return { check() {
    const vals = task.parts.map((_, i) => parseNum(card.querySelector(`#tri-in-${task.id}-${i}`).value));
    if (vals.some(x => x === null)) return { ok: false };
    let allC = true; const wrong = [];
    task.parts.forEach((p, i) => {
      const ok = Math.abs(vals[i] - p.answer) < 1e-9;
      if (!ok) { allC = false; wrong.push(`${p.key}) ты: ${fmtNum(vals[i])} · верно: **${p.answer} ${p.unit || ''}**`); }
      card.querySelector(`#tri-${task.id}-${i}`).classList.add(ok ? 'is-correct' : 'is-wrong');
      card.querySelector(`#tri-in-${task.id}-${i}`).disabled = true;
    });
    return { ok: true, correct: allC, wrong };
  }};
}

// ═══════════ МЕХАНИКА — КООРДИНАТЫ ТОЧКИ ═══════════

function buildCoord(task) {
  return buildGraph({ win: task.win, points: [{ x: task.point.x, y: task.point.y }] }) + `
    <div class="coord-row" id="coord-${task.id}">
      <span class="paren">(</span>
      <input class="num-field" type="text" inputmode="text" autocomplete="off" id="coord-x-${task.id}" placeholder="x">
      <span class="semi">;</span>
      <input class="num-field" type="text" inputmode="text" autocomplete="off" id="coord-y-${task.id}" placeholder="y">
      <span class="paren">)</span>
    </div>`;
}
function checkCoord(task, card) {
  const x = parseNum(card.querySelector(`#coord-x-${task.id}`).value);
  const y = parseNum(card.querySelector(`#coord-y-${task.id}`).value);
  if (x === null || y === null) return { ok: false };
  const ok = x === task.point.x && y === task.point.y; const wrong = [];
  if (!ok) wrong.push(`ты: (${fmtNum(x)}; ${fmtNum(y)}) · верно: **(${fmtNum(task.point.x)}; ${fmtNum(task.point.y)})**`);
  card.querySelector(`#coord-${task.id}`).classList.add(ok ? 'is-correct' : 'is-wrong');
  card.querySelector(`#coord-x-${task.id}`).disabled = true;
  card.querySelector(`#coord-y-${task.id}`).disabled = true;
  return { ok: true, correct: ok, wrong };
}

// ── РОУТЕРЫ (не-слайдерные механики) ─────────────────────────────────────────

function buildBody(task) {
  switch (task.mechanic) {
    case 'match_line':    return buildMatch(task, 'line');
    case 'match_parab':   return buildMatch(task, 'parab');
    case 'read_parab':    return buildReadParab(task);
    case 'roots_plane':   return buildRoots(task);
    case 'bins':          return buildBins(task);
    case 'single_choice': return buildSingleChoice(task);
    case 'triple_number': return buildTriple(task);
    case 'coord':         return buildCoord(task);
    default: return '';
  }
}
function initMechanic(task, card) {
  switch (task.mechanic) {
    case 'match_line':
    case 'match_parab':   return initMatch(task, card);
    case 'read_parab':    return initReadParab(task, card);
    case 'roots_plane':   return initRoots(task, card);
    case 'bins':          return initBins(task, card);
    case 'single_choice': return initSingleChoice(task, card);
    case 'triple_number': return initTriple(task, card);
    case 'coord':         return { check: () => checkCoord(task, card) };
    default: return { check: () => ({ ok: true, correct: true, wrong: [] }) };
  }
}

// ── СОСТОЯНИЕ + СОХРАНЕНИЕ ────────────────────────────────────────────────────

let DATA = null;
let idx = 0, combo = 0, firstTryCount = 0, finished = false, reported = false;
let devMode = false, allowSend = false;
let startTs = null, startPerf = null;
const results = [];

function localIso(d) {
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function fmtDur(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} мин ${s} с` : `${s} с`;
}

const HW_ID = 'dz_graf_urok2';
function progKey() {
  const u = (new URLSearchParams(location.search).get('u') || '').slice(0, 40);
  return `hwprog:${HW_ID}:${u}`;
}
function saveProgress() {
  if (devMode) return;
  try { localStorage.setItem(progKey(), JSON.stringify({ v: 1, results, firstTryCount, combo, finished, reported })); }
  catch (e) {}
}
function loadProgress() { try { return JSON.parse(localStorage.getItem(progKey()) || 'null'); } catch (e) { return null; } }
function clearProgress() { try { localStorage.removeItem(progKey()); } catch (e) {} }

function recordResult(task, correct, wrong) {
  results[idx] = { label: task.label, diff: task.difficulty, correct, wrong: wrong || [], feedback: task.feedback };
  if (correct) { firstTryCount++; combo++; } else combo = 0;
  updateCombo();
  document.getElementById('prog-fill').style.width = `${((idx + 1) / DATA.tasks.length) * 100}%`;
  saveProgress();
}
function updateCombo() {
  const el = document.getElementById('combo');
  if (combo >= 2) { el.textContent = `🔥 ${combo} подряд!`; el.classList.add('show'); }
  else el.classList.remove('show');
}

// ── «ЗАНОВО» (сброс прогресса) ────────────────────────────────────────────────

function doReset() {
  clearProgress();
  const p = new URLSearchParams(location.search);
  p.set('reset', '1');
  location.href = location.pathname + '?' + p.toString();
}
function resetStripHtml() {
  return `<div class="reset-strip"><button class="reset-btn" type="button" data-reset>Заново</button></div>`;
}
function wireReset(root) {
  const b = root.querySelector('[data-reset]');
  if (b) b.addEventListener('click', showResetConfirm);
}
function showResetConfirm() {
  const ov = document.getElementById('reset-overlay');
  if (ov) ov.classList.add('show');
}
function hideResetConfirm() {
  const ov = document.getElementById('reset-overlay');
  if (ov) ov.classList.remove('show');
}

// ── РЕНДЕР КАРТОЧКИ ───────────────────────────────────────────────────────────

function render() {
  if (idx >= DATA.tasks.length) return showFinal();
  if (!startTs) { startTs = new Date(); startPerf = performance.now(); }
  const task = DATA.tasks[idx];
  const screen = document.getElementById('screen');
  document.getElementById('prog-label').textContent = `${idx + 1} из ${DATA.tasks.length}`;
  document.getElementById('prog-fill').style.width = `${(idx / DATA.tasks.length) * 100}%`;

  const isLast = idx === DATA.tasks.length - 1;
  const isSlider = task.mechanic.indexOf('slider_') === 0;
  const hasHint = !!(task.hint && String(task.hint).trim());
  const num = idx + 1;
  const subtitle = String(task.label || '');

  screen.innerHTML = `
    <div class="task-card lk-card lk-screen" id="card-${task.id}">
      <div class="task-head">
        <div class="task-label-wrap">
          <span class="lk-tasknum">${num}</span>
          ${subtitle ? `<span class="task-label">${subtitle}</span>` : ''}
          <span class="task-diff">${task.difficulty || ''}</span>
          ${isSlider ? `<span class="task-round" id="task-round"></span>` : ''}
        </div>
        ${hasHint ? `<button class="lk-hint-btn lk-hint-btn--alive" id="hint-btn-${task.id}" type="button" aria-expanded="false" aria-controls="hint-${task.id}" aria-label="Подсказка от Леммы">Λ</button>` : ''}
      </div>
      ${hasHint ? `<div class="lk-hint-panel" id="hint-${task.id}"><div class="lk-hint-inner"><div class="lk-hint-body"><span class="lk-hint-tag">Λ Подсказка</span>${fmtInline(task.hint)}</div></div></div>` : ''}
      <p class="task-intro">${fmtInline(task.intro).replace(/\n/g, '<br>')}</p>
      <div class="task-body" id="body-${task.id}"></div>
      <div class="task-feedback" id="fb-${task.id}"><div class="fb-label">Разбор</div>${renderFeedback(task.feedback)}</div>
      ${isSlider ? '' : `<button class="lk-btn check-btn" id="btn-${task.id}">Проверить</button>`}
      <button class="lk-btn next-btn" id="next-${task.id}" hidden>${isLast ? 'К итогам ✨' : 'Дальше →'}</button>
    </div>
    ${resetStripHtml()}`;
  window.scrollTo(0, 0);
  wireReset(screen);

  const card = document.getElementById(`card-${task.id}`);
  const body = document.getElementById(`body-${task.id}`);
  const nextBtn = document.getElementById(`next-${task.id}`);

  const hintBtn = document.getElementById(`hint-btn-${task.id}`);
  if (hintBtn) {
    const panel = document.getElementById(`hint-${task.id}`);
    hintBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('is-open');
      hintBtn.classList.toggle('is-open', open);
      hintBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  nextBtn.addEventListener('click', () => { idx++; render(); });

  if (isSlider) { renderSlider(task, body, card, nextBtn); return; }

  body.innerHTML = buildBody(task);
  const checker = initMechanic(task, card);
  const checkBtn = document.getElementById(`btn-${task.id}`);
  checkBtn.addEventListener('click', () => {
    const res = checker.check();
    if (!res || !res.ok) { shake(checkBtn); return; }
    boom(res.correct);
    cardReact(card, res.correct);
    document.getElementById(`fb-${task.id}`).classList.add('show');
    checkBtn.disabled = true; checkBtn.hidden = true; nextBtn.hidden = false;
    recordResult(task, res.correct, res.wrong);
  });
}

function renderSlider(task, body, card, nextBtn) {
  const cfg = { profile: task.mechanic.replace('slider_', ''), rounds: task.rounds, easter: task.easter, win: task.win };
  let done = false;
  createParabEngine(body, cfg, () => {
    if (done) return; done = true;
    cardReact(card, true);
    document.getElementById(`fb-${task.id}`).classList.add('show');
    nextBtn.hidden = false;
    recordResult(task, true, []);
  });
}

// ── ОТЧЁТ И РАЗБОР (#38) ──────────────────────────────────────────────────────
// Механика общая для всех домашек — движок по URL (di-brand-kit/hw-core.js).
// Здесь остаётся только своё: как эта домашка рисует свою математику.

const REV_HELPERS = { fmtInline, renderFeedback };

function reportResults(score, total) {
  if (reported) return;
  const hw = `${DATA.meta.kicker} — ${DATA.meta.title}`;
  const durationSec = startPerf != null ? Math.round((performance.now() - startPerf) / 1000) : null;
  const sent = HwCore.report({
    hw, hw_id: HW_ID, score, total, results,
    startedAt: startTs ? localIso(startTs) : null,
    durationSec, devMode, allowSend,
  });
  if (sent) { reported = true; saveProgress(); }
}

// ── ЭКРАН ИТОГОВ ──────────────────────────────────────────────────────────────

function showFinal() {
  document.getElementById('screen').hidden = true;
  document.getElementById('hw-header').hidden = true;
  playSound('snd-final');

  const total = DATA.tasks.length;
  finished = true;
  reportResults(firstTryCount, total);
  saveProgress();
  const tier = firstTryCount === total ? '🏆 Идеально — ни одной осечки!'
             : firstTryCount >= total - 2 ? '💪 Крепко держишь параболу!'
             : '🔁 Загляни в разборы — и прокрути ещё разок.';

  const revHtml = HwCore.revItemsHtml(results, REV_HELPERS);

  const f = DATA.final;
  const pct = total ? Math.round(firstTryCount / total * 100) : 0;
  const durSec = startPerf != null ? Math.round((performance.now() - startPerf) / 1000) : null;
  const durTxt = fmtDur(durSec);
  const statsHtml = `
    <div class="fin-stats" style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 4px">
      <div class="fin-stat" style="flex:1;min-width:88px;text-align:center;padding:12px 8px;border-radius:14px;background:rgba(124,108,240,.12);border:1px solid rgba(124,108,240,.28)">
        <div style="font-size:26px;font-weight:700;line-height:1">${firstTryCount}<span style="font-size:15px;opacity:.6">/${total}</span></div>
        <div style="font-size:11px;opacity:.7;margin-top:3px">с первого раза</div>
      </div>
      <div class="fin-stat" style="flex:1;min-width:88px;text-align:center;padding:12px 8px;border-radius:14px;background:rgba(79,169,255,.12);border:1px solid rgba(79,169,255,.28)">
        <div style="font-size:26px;font-weight:700;line-height:1">${pct}<span style="font-size:15px;opacity:.6">%</span></div>
        <div style="font-size:11px;opacity:.7;margin-top:3px">точность</div>
      </div>
      ${durTxt ? `<div class="fin-stat" style="flex:1;min-width:88px;text-align:center;padding:12px 8px;border-radius:14px;background:rgba(91,191,138,.12);border:1px solid rgba(91,191,138,.28)">
        <div style="font-size:20px;font-weight:700;line-height:1.2">${durTxt}</div>
        <div style="font-size:11px;opacity:.7;margin-top:3px">время</div>
      </div>` : ''}
    </div>`;
  const el = document.getElementById('final-screen');
  el.innerHTML = `
    <div class="lk-card" style="padding:22px 18px">
      <div class="fin-theme">${f.theme}</div>
      <div class="fin-tier">${tier}</div>
      ${statsHtml}
      ${revHtml}
    </div>
    <div class="lk-card fin-card">
      <div class="fin-unlock">${f.unlock}</div>
      <p class="fin-tease">${fmtInline(f.tease)}</p>
      <p class="fin-counter"><b>${firstTryCount}</b> ${f.counter_label} из ${total}</p>
    </div>
    ${reported
      ? `<p class="send-note" style="text-align:center">✅ Результат уже отправлен репетитору — он увидит, что освоено, а что подтянуть.</p>`
      : ''}
    <button id="btn-retry" class="lk-btn" style="width:100%;margin-top:16px;padding:14px;border-radius:14px;font-size:15px;font-weight:600;background:rgba(124,108,240,.14);border:1px solid rgba(124,108,240,.35);color:inherit;cursor:pointer">🔁 Пройти заново</button>
    <div class="lk-sign" style="margin-top:22px">
      <span class="lk-badge lk-badge-l">Λ</span>
      <span class="lk-badge lk-badge-d">D.</span>
    </div>
    <div style="height:32px"></div>`;
  el.classList.add('show');
  window.scrollTo(0, 0);

  const retry = document.getElementById('btn-retry');
  if (retry) retry.addEventListener('click', showResetConfirm);

  el.querySelectorAll('.rev-item.bad .rev-head').forEach(head => head.addEventListener('click', () => {
    const item = head.closest('.rev-item');
    const open = item.classList.toggle('open');
    const tg = item.querySelector('.rev-toggle');
    if (tg) tg.textContent = open ? 'скрыть ▴' : 'показать ▾';
  }));
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────

function showAppScreens() {
  document.getElementById('hw-header').hidden = false;
  document.getElementById('screen').hidden = false;
}
function startHw() {
  showAppScreens();
  Piano.wake();
  render();
}
function restoreProgress() {
  const saved = loadProgress();
  if (!saved || !Array.isArray(saved.results) || !saved.results.length) return false;
  saved.results.forEach(r => results.push(r));
  firstTryCount = (typeof saved.firstTryCount === 'number') ? saved.firstTryCount : results.filter(r => r && r.correct).length;
  combo = saved.combo || 0; reported = !!saved.reported; finished = !!saved.finished;
  idx = results.length;
  showAppScreens();
  if (finished || idx >= DATA.tasks.length) showFinal(); else render();
  return true;
}
function devGoto(n) {
  devMode = true;
  const total = DATA.tasks.length;
  const target = clamp(n, 1, total) - 1;
  for (let i = 0; i < target; i++) {
    const t = DATA.tasks[i];
    results[i] = { label: t.label, diff: t.difficulty, correct: true, wrong: [], feedback: t.feedback };
  }
  firstTryCount = target; idx = target;
  showAppScreens();
  render();
}
function init(data) {
  DATA = data;
  const yes = document.getElementById('reset-yes');
  const no  = document.getElementById('reset-no');
  if (yes) yes.addEventListener('click', doReset);
  if (no)  no.addEventListener('click', hideResetConfirm);

  const qs = new URLSearchParams(location.search);
  // `?r=ник.id` — Ди смотрит разбор попытки ученика. Домашку не запускаем.
  const rev = HwCore.reviewCode();
  if (rev) {
    HwCore.showReview(rev, {
      mount: document.getElementById('final-screen'),
      helpers: REV_HELPERS,
      hide: [document.getElementById('screen'), document.getElementById('hw-header')],
    });
    return;
  }
  if (qs.get('reset') === '1') clearProgress();
  allowSend = qs.get('send') === '1';
  const g = parseInt(qs.get('g') || qs.get('goto'), 10);
  if (!isNaN(g)) { devGoto(g); return; }
  if (!restoreProgress()) startHw();
}

fetch('data.json?v=1')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => {
    document.getElementById('screen').hidden = false;
    document.getElementById('screen').innerHTML =
      '<p style="color:var(--lk-bad);padding:20px;font-size:15px">Ошибка загрузки данных. Обновите страницу.</p>';
  });
