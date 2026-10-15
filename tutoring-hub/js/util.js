/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* Shared helpers used by every question bank and by the app. */
window.HUB = window.HUB || {};
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const nz = (a, b) => { let v; do { v = rnd(a, b); } while (v === 0); return v; };
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n) { return shuffle(a).slice(0, n); }
const neg = n => (n < 0 ? '−' + Math.abs(n) : '' + n);               // typographic minus
const sg = n => (n < 0 ? '− ' + Math.abs(n) : '+ ' + n);              // " + 5" / " − 5"
const term = (n, v = 'x') => (n < 0 ? '− ' : '+ ') + (Math.abs(n) === 1 ? v : Math.abs(n) + v);
const coef = (a, v = 'x') => (a === 1 ? v : a === -1 ? '−' + v : neg(a) + v);
const paren = n => (n < 0 ? '(' + neg(n) + ')' : '' + n);
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b ? gcd(b, a % b) : a; }
function frac(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? neg(n) : neg(n) + '/' + d; }
const fmt = n => (Number.isInteger(n) ? neg(n) : neg(+n.toFixed(2)));
const money = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
function toNum(s) { return Number(String(s).replace(/−/g, '-')); }
/* Build numeric distractors: use the "mistake" candidates first, then nearby values. */
function distinct(correct, cands) {
  const out = [], seen = new Set([String(correct)]);
  for (const c of cands) { const s = String(c); if (!seen.has(s) && !/NaN|Infinity/.test(s) && out.length < 3) { seen.add(s); out.push(s); } }
  const base = toNum(correct);
  if (isNaN(base)) return out;
  for (let k = 1; out.length < 3 && k < 60; k++) { const s = fmt(base + Math.ceil(k / 2) * (k % 2 ? 1 : -1)); if (!seen.has(s)) { seen.add(s); out.push(s); } }
  return out;
}
function parseNum(s) {
  if (s == null) return NaN;
  s = String(s).replace(/−/g, '-').replace(/\s/g, '').replace(/^\$/, '');
  if (/^-?\d+\/-?\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return a / b; }
  return s === '' ? NaN : Number(s);
}
const M = s => `<span class="math">${s}</span>`;
