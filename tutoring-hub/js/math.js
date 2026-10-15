/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   ALGEBRA I QUESTION BANK
   Every entry is a GENERATOR: each call to make() builds a brand-new problem
   with new numbers (and often a new context), so practice and tests never
   repeat. Wrong answer choices come from real student mistakes.
   Each problem returns:
     stem, correct, distractors[3], type ('mc' | 'num'), answer (for 'num'),
     explain (full worked solution), hints[] (a ladder: nudge -> bigger help)
   Standards: Mississippi College & Career Readiness Standards (MS CCRS).
   Foundations items use the middle-grades standard they come from.
   ===================================================================== */
HUB.std = Object.assign(HUB.std || {}, {
  '7.NS.1': 'Add & subtract integers', '7.NS.2': 'Multiply & divide integers', '6.EE.2': 'Order of operations & evaluating',
  '5.NF.1': 'Fraction operations', '7.RP.3': 'Percents in real life', '7.EE.1': 'Combine like terms & distribute', '7.EE.4': 'One- & two-step equations',
  'N-Q.1': 'Units & quantities', 'A-REI.3': 'Solve linear equations & inequalities', 'A-CED.1': 'Write & solve equations from words', 'A-CED.4': 'Literal equations',
  'F-IF.1': 'What is a function?', 'F-IF.2': 'Function notation & evaluating', 'F-IF.5': 'Domain & range',
  'F-IF.6': 'Slope / rate of change', 'A-CED.2': 'Write linear equations from context', 'F-LE.2': 'Write equations from tables & points', 'A-REI.10': 'Points & intercepts on a graph',
  'A-REI.6': 'Systems of equations', 'A-REI.12': 'Systems of inequalities',
  'S-ID.2': 'Center & spread of data', 'S-ID.6': 'Scatter plots & correlation', 'S-ID.7': 'Interpret a line of best fit',
  'N-RN.2': 'Properties of exponents', 'F-LE.1': 'Linear vs. exponential',
  'A-APR.1': 'Add, subtract & multiply polynomials', 'A-SSE.2': 'Factoring', 'A-REI.4': 'Solve quadratic equations', 'F-IF.8': 'Key features of quadratics'
});

HUB.units = HUB.units || {};
HUB.units.math = [
  { n: 0, title: 'Foundations Bootcamp', stds: ['7.NS.1', '7.NS.2', '6.EE.2', '5.NF.1', '7.RP.3', '7.EE.1', '7.EE.4'] },
  { n: 1, title: 'Equations & Inequalities', stds: ['A-REI.3', 'A-CED.1', 'A-CED.4', 'N-Q.1'] },
  { n: 2, title: 'Functions', stds: ['F-IF.1', 'F-IF.2', 'F-IF.5'] },
  { n: 3, title: 'Linear Functions', stds: ['F-IF.6', 'A-CED.2', 'F-LE.2', 'A-REI.10'] },
  { n: 4, title: 'Systems', stds: ['A-REI.6', 'A-REI.12'] },
  { n: 5, title: 'Statistics', stds: ['S-ID.2', 'S-ID.6', 'S-ID.7'] },
  { n: 6, title: 'Exponents & Exponential Functions', stds: ['N-RN.2', 'F-LE.1'] },
  { n: 7, title: 'Polynomials & Quadratics', stds: ['A-APR.1', 'A-SSE.2', 'A-REI.4', 'F-IF.8'] }
];

const NAMES = ['Ezekiel', 'Jaylen', 'Maria', 'Tanya', 'Marcus', 'Aaliyah', 'Caleb', 'Destiny', 'Jordan', 'Kendrick', 'Imani', 'Luis'];
const numMaybe = p => (Math.random() < p ? 'num' : 'mc');

HUB.math = [
/* ---------------- UNIT 0 · FOUNDATIONS ---------------- */
{ id: 'int-add', std: '7.NS.1', make() {
  const a = nz(-20, 20), b = nz(-20, 20), v = a + b;
  return { stem: `Simplify: ${M(`${neg(a)} + ${paren(b)}`)}`, correct: neg(v), distractors: distinct(neg(v), [neg(a - b), neg(-v), neg(Math.abs(a) + Math.abs(b))]),
    type: numMaybe(.4), answer: v,
    hints: ['Think of a number line. Start at ' + neg(a) + '.', b < 0 ? `Adding a negative means move LEFT ${Math.abs(b)}.` : `Adding a positive means move RIGHT ${b}.`],
    explain: `Start at ${neg(a)} and move ${b < 0 ? 'left' : 'right'} ${Math.abs(b)}: ${neg(a)} + ${paren(b)} = ${neg(v)}.` };
}},
{ id: 'int-sub', std: '7.NS.1', make() {
  const a = nz(-15, 15), b = nz(-15, 15), v = a - b;
  return { stem: `Simplify: ${M(`${neg(a)} − ${paren(b)}`)}`, correct: neg(v), distractors: distinct(neg(v), [neg(a + b), neg(-v), neg(b - a)]),
    type: numMaybe(.4), answer: v,
    hints: ['Subtracting is the same as adding the opposite ("Keep, Change, Change").', `Rewrite as ${neg(a)} + ${paren(-b)}.`],
    explain: `Keep ${neg(a)}, change − to +, change ${neg(b)} to ${neg(-b)}: ${neg(a)} + ${paren(-b)} = ${neg(v)}.` };
}},
{ id: 'int-muldiv', std: '7.NS.2', make() {
  const a = nz(-12, 12), b = nz(-9, 9);
  if (Math.random() < .5) { const v = a * b;
    return { stem: `Simplify: ${M(`${paren(a)} × ${paren(b)}`)}`, correct: neg(v), distractors: distinct(neg(v), [neg(-v), neg(a + b), neg(Math.abs(v) + 1)]),
      type: numMaybe(.4), answer: v, hints: ['Multiply the numbers first, then decide the sign.', 'Same signs → positive. Different signs → negative.'],
      explain: `${Math.abs(a)} × ${Math.abs(b)} = ${Math.abs(v)}. The signs are ${(a < 0) === (b < 0) ? 'the same, so the answer is positive' : 'different, so the answer is negative'}: ${neg(v)}.` }; }
  const p = a * b;
  return { stem: `Simplify: ${M(`${neg(p)} ÷ ${paren(b)}`)}`, correct: neg(a), distractors: distinct(neg(a), [neg(-a), neg(p - b), neg(b)]),
    type: numMaybe(.4), answer: a, hints: ['Divide the numbers first, then decide the sign.', 'Same signs → positive. Different signs → negative.'],
    explain: `${Math.abs(p)} ÷ ${Math.abs(b)} = ${Math.abs(a)}. ${(p < 0) === (b < 0) ? 'Same signs → positive' : 'Different signs → negative'}: ${neg(a)}.` };
}},
{ id: 'order-ops', std: '6.EE.2', make() {
  const t = rnd(0, 3);
  if (t === 0) { const a = rnd(2, 15), b = rnd(2, 9), c = rnd(2, 9), v = a + b * c;
    return { stem: `Evaluate: ${M(`${a} + ${b} × ${c}`)}`, correct: neg(v), distractors: distinct(neg(v), [(a + b) * c, a + b + c, a * b + c]), type: numMaybe(.3), answer: v,
      hints: ['PEMDAS: multiplication comes before addition.', `First find ${b} × ${c}.`], explain: `Multiply first: ${b} × ${c} = ${b * c}. Then add: ${a} + ${b * c} = ${v}.` }; }
  if (t === 1) { const a = rnd(20, 40), b = rnd(2, 5), c = rnd(6, 9), d = rnd(1, 5), v = a - b * (c - d);
    return { stem: `Evaluate: ${M(`${a} − ${b}(${c} − ${d})`)}`, correct: neg(v), distractors: distinct(neg(v), [(a - b) * (c - d), a - b * c - d, a - b * c + d]), type: numMaybe(.3), answer: v,
      hints: ['Parentheses first.', `${c} − ${d} = ${c - d}. Next multiply by ${b}, then subtract from ${a}.`], explain: `Parentheses: ${c} − ${d} = ${c - d}. Multiply: ${b} × ${c - d} = ${b * (c - d)}. Subtract: ${a} − ${b * (c - d)} = ${v}.` }; }
  if (t === 2) { const a = rnd(2, 6), b = rnd(1, 9), c = rnd(2, 4), q = rnd(2, 6), v = a * a + b * c - q;
    return { stem: `Evaluate: ${M(`${a}² + ${b} × ${c} − ${q}`)}`, correct: neg(v), distractors: distinct(neg(v), [a * 2 + b * c - q, (a * a + b) * c - q, a * a + b * (c - q)]), type: numMaybe(.3), answer: v,
      hints: ['Exponents come before multiplication.', `${a}² means ${a} × ${a}, not ${a} × 2.`], explain: `Exponent: ${a}² = ${a * a}. Multiply: ${b} × ${c} = ${b * c}. Then left to right: ${a * a} + ${b * c} − ${q} = ${v}.` }; }
  const b = rnd(2, 6), q = rnd(2, 8), a = b * q, c = rnd(1, 9), v = a / b + c * 2;
  return { stem: `Evaluate: ${M(`${a} ÷ ${b} + ${c} × 2`)}`, correct: neg(v), distractors: distinct(neg(v), [(a / b + c) * 2, a / (b + c) * 2, a / b + c + 2].map(x => fmt(x))), type: numMaybe(.3), answer: v,
    hints: ['Do multiplication and division (left to right) before addition.'], explain: `${a} ÷ ${b} = ${q} and ${c} × 2 = ${c * 2}. Then ${q} + ${c * 2} = ${v}.` };
}},
{ id: 'frac-add', std: '5.NF.1', make() {
  const b = pick([2, 3, 4, 5, 6, 8]), d = pick([3, 4, 5, 6, 10, 12].filter(x => x !== b)), a = rnd(1, b - 1), c = rnd(1, d - 1), sub = Math.random() < .4;
  const n = sub ? a * d - c * b : a * d + c * b, den = b * d;
  const ans = frac(n, den);
  return { stem: `${sub ? 'Subtract' : 'Add'}: ${M(`${a}/${b} ${sub ? '−' : '+'} ${c}/${d}`)}  (simplify)`, correct: ans,
    distractors: distinct(ans, [frac(sub ? a - c : a + c, b + d), frac(sub ? a - c : a + c, b * d), frac(n + den, den)]), type: 'mc',
    hints: ['You need a common denominator before you can add or subtract.', `A common denominator for ${b} and ${d} is ${den} (or smaller). Rewrite both fractions.`, 'Add or subtract only the numerators, then simplify.'],
    explain: `${a}/${b} = ${a * d}/${den} and ${c}/${d} = ${c * b}/${den}. ${sub ? 'Subtract' : 'Add'} numerators: ${n}/${den} = ${ans}.` };
}},
{ id: 'frac-mul', std: '5.NF.1', make() {
  const a = rnd(1, 5), b = rnd(2, 9), c = rnd(1, 5), d = rnd(2, 9), div = Math.random() < .45;
  const ans = div ? frac(a * d, b * c) : frac(a * c, b * d);
  return { stem: `${div ? 'Divide' : 'Multiply'}: ${M(`${a}/${b} ${div ? '÷' : '×'} ${c}/${d}`)}  (simplify)`, correct: ans,
    distractors: distinct(ans, div ? [frac(a * c, b * d), frac(b * c, a * d), frac(a + c, b + d)] : [frac(a * d, b * c), frac(a + c, b + d), frac(a * c, b + d)]), type: 'mc',
    hints: div ? ['Dividing by a fraction = multiplying by its reciprocal ("Keep, Change, Flip").', `Flip ${c}/${d} to ${d}/${c}, then multiply straight across.`] : ['Multiply numerator × numerator and denominator × denominator.', 'Simplify at the end.'],
    explain: div ? `Keep ${a}/${b}, change ÷ to ×, flip to ${d}/${c}: (${a}×${d})/(${b}×${c}) = ${a * d}/${b * c} = ${ans}.` : `(${a}×${c})/(${b}×${d}) = ${a * c}/${b * d} = ${ans}.` };
}},
{ id: 'percent', std: '7.RP.3', make() {
  const t = rnd(0, 2);
  if (t === 0) { const price = pick([40, 60, 80, 120, 50, 90]), p = pick([10, 20, 25, 30, 40]), item = pick(['pair of Jordans', 'video game', 'jacket', 'phone case']), sale = price * (100 - p) / 100;
    return { stem: `A ${money(price)} ${item} is ${p}% off. What is the sale price?`, correct: money(sale), distractors: distinct(money(sale), [money(price * p / 100), money(price - p), money(price * (1 + p / 100))]),
      type: 'mc', hints: [`Find ${p}% of ${money(price)} first: ${p}% = ${p / 100}.`, 'The discount is SUBTRACTED from the original price.'],
      explain: `${p}% of ${price} = ${p / 100} × ${price} = ${price * p / 100}. Sale price = ${price} − ${price * p / 100} = ${money(sale)}.` }; }
  if (t === 1) { const bill = pick([20, 40, 60, 80, 30]), p = pick([15, 20, 10]), tip = bill * p / 100;
    return { stem: `A meal costs ${money(bill)}. How much is a ${p}% tip?`, correct: money(tip), distractors: distinct(money(tip), [money(bill + tip), money(p), money(tip * 10)]), type: 'mc',
      hints: [`${p}% means ${p} out of 100, or ${p / 100}.`, `Multiply ${p / 100} × ${bill}.`], explain: `${p / 100} × ${bill} = ${money(tip)}.` }; }
  const total = pick([20, 25, 40, 50]), part = total * pick([.2, .4, .6, .8]), p = Math.round(part / total * 100);
  return { stem: `Ezekiel got ${part} out of ${total} questions right. What percent is that?`, correct: p + '%', distractors: distinct(p, [part, 100 - p, Math.round(total / part * 10)]).map(x => x + '%'), type: 'mc',
    hints: ['Percent = part ÷ whole × 100.', `Compute ${part} ÷ ${total}.`], explain: `${part} ÷ ${total} = ${part / total}. × 100 = ${p}%.` };
}},
{ id: 'like-terms', std: '7.EE.1', make() {
  const a = nz(-9, 9), b = nz(-12, 12), c = nz(-9, 9), d = nz(-12, 12); if (a + c === 0) return this.make();
  const A = a + c, B = b + d, ans = `${coef(A)} ${sg(B)}`.replace('+ 0', '').trim();
  return { stem: `Simplify: ${M(`${coef(a)} ${sg(b)} ${term(c)} ${sg(d)}`)}`, correct: ans,
    distractors: [`${coef(A + 2)} ${sg(B)}`, `${coef(a - c)} ${sg(b - d)}`, `${coef(A)} ${sg(-B)}`, `${A + B}x`].filter(x => x !== ans).slice(0, 3), type: 'mc',
    hints: ['Like terms have the SAME variable part. Group the x-terms together and the numbers together.', `x-terms: ${coef(a)} and ${coef(c)}. Numbers: ${neg(b)} and ${neg(d)}.`],
    explain: `x-terms: ${neg(a)} + ${paren(c)} = ${neg(A)}, so ${coef(A)}. Numbers: ${neg(b)} + ${paren(d)} = ${neg(B)}. Answer: ${ans}.` };
}},
{ id: 'distribute', std: '7.EE.1', make() {
  const a = nz(-6, 6), b = rnd(2, 7), c = nz(-9, 9); if (a === 1) return this.make();
  const ans = `${coef(a * b)} ${sg(a * c)}`;
  return { stem: `Use the distributive property: ${M(`${neg(a)}(${b}x ${sg(c)})`)}`, correct: ans,
    distractors: [`${coef(a * b)} ${sg(c)}`, `${coef(a * b)} ${sg(-a * c)}`, `${coef(a + b)} ${sg(a + c)}`].filter(x => x !== ans), type: 'mc',
    hints: ['Multiply the outside number by EVERY term inside the parentheses.', `${neg(a)} × ${b}x = ? and ${neg(a)} × ${paren(c)} = ?`],
    explain: `${neg(a)} × ${b}x = ${coef(a * b)} and ${neg(a)} × ${paren(c)} = ${neg(a * c)}. Answer: ${ans}.` };
}},
{ id: 'evaluate', std: '6.EE.2', make() {
  const x = nz(-5, 5), y = nz(-6, 6), a = rnd(2, 4), b = rnd(2, 6), v = a * x * x - b * y;
  return { stem: `Evaluate ${M(`${a}x² − ${b}y`)} when ${M(`x = ${neg(x)}`)} and ${M(`y = ${neg(y)}`)}.`, correct: neg(v),
    distractors: distinct(neg(v), [-a * x * x - b * y, a * 2 * x - b * y, a * x * x + b * y].map(neg)), type: numMaybe(.3), answer: v,
    hints: ['Replace each letter with its number in parentheses.', `(${neg(x)})² is ${x * x} — a negative squared is positive.`],
    explain: `${a}(${neg(x)})² − ${b}(${neg(y)}) = ${a}(${x * x}) ${sg(-b * y)} = ${a * x * x} ${sg(-b * y)} = ${neg(v)}.` };
}},
{ id: 'one-step', std: '7.EE.4', make() {
  const x = nz(-12, 12), t = rnd(0, 2);
  if (t === 0) { const a = nz(-15, 15), c = x + a;
    return { stem: `Solve: ${M(`x ${sg(a)} = ${neg(c)}`)}`, correct: neg(x), distractors: distinct(neg(x), [neg(c + a), neg(-x), neg(c)]), type: numMaybe(.5), answer: x,
      hints: [`What is being done to x? ${a < 0 ? 'Subtracting ' + Math.abs(a) : 'Adding ' + a}.`, `Do the opposite to both sides: ${a < 0 ? 'add ' + Math.abs(a) : 'subtract ' + a}.`], explain: `${a < 0 ? 'Add ' + Math.abs(a) : 'Subtract ' + a} on both sides: x = ${neg(c)} ${sg(-a)} = ${neg(x)}.` }; }
  if (t === 1) { const a = nz(-9, 9); if (a === 1) return this.make(); const c = a * x;
    return { stem: `Solve: ${M(`${neg(a)}x = ${neg(c)}`)}`, correct: neg(x), distractors: distinct(neg(x), [neg(c * a), neg(-x), neg(c - a)]), type: numMaybe(.5), answer: x,
      hints: [`x is being multiplied by ${neg(a)}.`, `Divide both sides by ${neg(a)}.`], explain: `${neg(c)} ÷ ${paren(a)} = ${neg(x)}.` }; }
  const a = rnd(2, 6), c = x;
  return { stem: `Solve: ${M(`x/${a} = ${neg(c)}`)}`, correct: neg(c * a), distractors: distinct(neg(c * a), [fmt(c / a), neg(c + a), neg(-c * a)]), type: numMaybe(.5), answer: c * a,
    hints: [`x is being divided by ${a}.`, `Multiply both sides by ${a}.`], explain: `${neg(c)} × ${a} = ${neg(c * a)}.` };
}},

/* ---------------- UNIT 1 · EQUATIONS & INEQUALITIES ---------------- */
{ id: 'two-step', std: 'A-REI.3', make() {
  const x = nz(-9, 9), a = rnd(2, 9), b = nz(-15, 15), c = a * x + b;
  return { stem: `Solve for <i>x</i>: ${M(`${a}x ${sg(b)} = ${neg(c)}`)}`, correct: neg(x), distractors: distinct(neg(x), [fmt((c + b) / a), neg(-x), fmt(c / a - b)]),
    type: numMaybe(.35), answer: x, hints: ['Undo addition/subtraction FIRST, then multiplication.', `${b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b} on both sides.`, `Now divide both sides by ${a}.`],
    explain: `${a}x = ${neg(c)} ${sg(-b)} = ${neg(c - b)}. Then x = ${neg(c - b)} ÷ ${a} = ${neg(x)}.` };
}},
{ id: 'multi-step', std: 'A-REI.3', make() {
  const x = nz(-8, 8), a = rnd(2, 6), b = nz(-7, 7), k = rnd(1, 4), c = a * (x + b) + k * x;
  return { stem: `Solve: ${M(`${a}(x ${sg(b)}) ${term(k)} = ${neg(c)}`)}`, correct: neg(x), distractors: distinct(neg(x), [fmt((c - b) / (a + k)), fmt((c - a * b) / a), fmt((c + a * b) / (a + k))]),
    type: numMaybe(.35), answer: x, hints: ['Step 1: distribute.', 'Step 2: combine the x-terms.', 'Step 3: undo the constant, then divide.'],
    explain: `Distribute: ${a}x ${sg(a * b)} ${term(k)} = ${neg(c)}. Combine: ${a + k}x ${sg(a * b)} = ${neg(c)}. Subtract: ${a + k}x = ${neg(c - a * b)}. Divide: x = ${neg(x)}.` };
}},
{ id: 'both-sides', std: 'A-REI.3', make() {
  const x = nz(-8, 8), a = rnd(3, 9), c = rnd(1, a - 1), b = nz(-12, 12), d = (a - c) * x + b;
  return { stem: `Solve: ${M(`${a}x ${sg(b)} = ${c === 1 ? '' : c}x ${sg(d)}`)}`, correct: neg(x), distractors: distinct(neg(x), [fmt((d - b) / (a + c)), fmt((d + b) / (a - c)), neg(-x)]),
    type: numMaybe(.35), answer: x, hints: ['Get all x-terms on ONE side.', `Subtract ${coef(c)} from both sides.`, 'Now it is a two-step equation.'],
    explain: `Subtract ${coef(c)}: ${a - c}x ${sg(b)} = ${neg(d)}. Subtract ${neg(b)}: ${a - c}x = ${neg(d - b)}. Divide: x = ${neg(x)}.` };
}},
{ id: 'ineq-flip', std: 'A-REI.3', make() {
  const a = rnd(2, 6), k = nz(-6, 6), b = rnd(1, 12), c = b - a * k, op = pick(['>', '<', '≥', '≤']);
  const flipMap = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }, f = flipMap[op];
  return { stem: `Solve: ${M(`−${a}x + ${b} ${op} ${neg(c)}`)}`, correct: `x ${f} ${neg(k)}`, distractors: [`x ${op} ${neg(k)}`, `x ${f} ${neg(-k)}`, `x ${op} ${neg(-k)}`], type: 'mc',
    hints: ['Solve it like an equation first.', `When you divide by −${a} (a NEGATIVE), you must FLIP the inequality sign.`],
    explain: `Subtract ${b}: −${a}x ${op} ${neg(c - b)}. Divide by −${a} and flip: x ${f} ${neg(k)}.` };
}},
{ id: 'word-eq', std: 'A-CED.1', make() {
  const n = pick(NAMES), b = pick([20, 35, 50, 80, 15]), m = pick([10, 15, 20, 25, 12]), w = rnd(3, 12), T = b + m * w, item = pick(['a new phone', 'a pair of sneakers', 'a gaming headset', 'a class trip']);
  return { stem: `${n} has ${money(b)} saved for ${item} and saves ${money(m)} each week. In how many weeks will ${n} have ${money(T)}?`, correct: String(w),
    distractors: distinct(w, [Math.round(T / m), w + 1, Math.round((T + b) / m)]), type: numMaybe(.5), answer: w,
    hints: ['Write an equation: start amount + (weekly amount × weeks) = goal.', `${b} + ${m}w = ${T}`, `Subtract ${b}, then divide by ${m}.`],
    explain: `${b} + ${m}w = ${T} → ${m}w = ${T - b} → w = ${w} weeks.` };
}},
{ id: 'special-sol', std: 'A-REI.3', make() {
  const a = rnd(2, 5), b = nz(-8, 8), t = rnd(0, 2);
  let stem, ans;
  if (t === 0) { stem = `${a}(x ${sg(b)}) = ${a}x ${sg(a * b)}`; ans = 'Infinitely many solutions'; }
  else if (t === 1) { stem = `${a}(x ${sg(b)}) = ${a}x ${sg(a * b + nz(1, 5))}`; ans = 'No solution'; }
  else { const x = nz(-6, 6); stem = `${a}(x ${sg(b)}) = ${a + 1}x ${sg(a * b - x)}`; ans = `x = ${neg(x)}`; }
  return { stem: `How many solutions does ${M(stem)} have?`, correct: ans, distractors: ['Infinitely many solutions', 'No solution', 'x = 0', `x = ${neg(a)}`].filter(z => z !== ans).slice(0, 3), type: 'mc',
    hints: ['Distribute and simplify both sides.', 'If the x-terms cancel: a TRUE statement (like 6 = 6) → infinitely many; a FALSE statement (like 6 = 9) → no solution.'],
    explain: t === 0 ? 'Both sides simplify to the same expression, so every x works: infinitely many solutions.' : t === 1 ? 'The x-terms cancel and leave a false statement (two different numbers), so there is no solution.' : `The x-terms do not cancel, so there is exactly one solution: ${ans}.` };
}},
{ id: 'literal', std: 'A-CED.4', make() {
  const t = pick([['A = lw', 'w', 'w = A/l', ['w = A − l', 'w = lA', 'w = l/A']], ['P = 2l + 2w', 'l', 'l = (P − 2w)/2', ['l = P − w', 'l = (P − w)/2', 'l = P/2 − 2w']], ['d = rt', 't', 't = d/r', ['t = dr', 't = r/d', 't = d − r']], ['y = mx + b', 'x', 'x = (y − b)/m', ['x = y/m − b', 'x = (y + b)/m', 'x = m(y − b)']], ['I = Prt', 'r', 'r = I/(Pt)', ['r = IPt', 'r = I − Pt', 'r = Pt/I']], ['C = 2πr', 'r', 'r = C/(2π)', ['r = 2πC', 'r = C − 2π', 'r = 2π/C']], ['V = lwh', 'h', 'h = V/(lw)', ['h = Vlw', 'h = V − lw', 'h = lw/V']]]);
  return { stem: `Solve ${M(t[0])} for <i>${t[1]}</i>.`, correct: t[2], distractors: t[3], type: 'mc',
    hints: [`Treat every letter except ${t[1]} like a number.`, `Use inverse operations to get ${t[1]} alone.`], explain: `Isolate ${t[1]} with inverse operations: ${t[2]}.` };
}},
{ id: 'units', std: 'N-Q.1', make() {
  const t = rnd(0, 2);
  if (t === 0) { const mph = pick([30, 45, 50, 60, 65, 70]), h = pick([2, 3, 4, 1.5, 2.5]), d = mph * h, city = pick(['Jackson', 'Memphis', 'Tupelo', 'Oxford', 'Hattiesburg']);
    return { stem: `A bus leaves Southaven for ${city} and travels at ${mph} miles per hour for ${h} hours. How many miles does it travel?`, correct: fmt(d), distractors: distinct(fmt(d), [fmt(mph / h), fmt(mph + h), fmt(d / 2)]),
      type: numMaybe(.4), answer: d, hints: ['Look at the units: miles/hour × hours = ?', 'The hours cancel, leaving miles. Multiply.'], explain: `${mph} × ${h} = ${fmt(d)} miles.` }; }
  if (t === 1) { const ft = rnd(2, 9) * 3;
    return { stem: `How many yards are in ${ft} feet? (3 feet = 1 yard)`, correct: String(ft / 3), distractors: distinct(ft / 3, [ft * 3, ft + 3, ft - 3]), type: numMaybe(.4), answer: ft / 3,
      hints: ['Yards are BIGGER than feet, so the number should get smaller.', 'Divide by 3.'], explain: `${ft} ÷ 3 = ${ft / 3} yards.` }; }
  const min = rnd(2, 6) * 60;
  return { stem: `A practice lasts ${min} minutes. How many hours is that?`, correct: String(min / 60), distractors: distinct(min / 60, [min * 60, min / 100, min / 60 + 1]), type: numMaybe(.4), answer: min / 60,
    hints: ['60 minutes = 1 hour.'], explain: `${min} ÷ 60 = ${min / 60} hours.` };
}},

/* ---------------- UNIT 2 · FUNCTIONS ---------------- */
{ id: 'is-function', std: 'F-IF.1', make() {
  const pairs = n => { const xs = sample([-3, -2, -1, 0, 1, 2, 3, 4, 5], n); return xs.map(x => [x, rnd(-5, 6)]); };
  const show = ps => '{' + ps.map(p => `(${neg(p[0])}, ${neg(p[1])})`).join(', ') + '}';
  const good = pairs(4);
  const bad = () => { const p = pairs(3); const r = pick(p); let y; do { y = rnd(-5, 6); } while (y === r[1]); return shuffle(p.concat([[r[0], y]])); };
  return { stem: 'Which relation is a <b>function</b>?', correct: show(good), distractors: [show(bad()), show(bad()), show(bad())], type: 'mc',
    hints: ['In a function, each INPUT (x) has exactly ONE output (y).', 'Look for an x-value that appears twice with different y-values — that is NOT a function.'],
    explain: 'The correct relation never repeats an x-value with a different y-value. Each of the others has one x-value paired with two different outputs.' };
}},
{ id: 'f-eval-quad', std: 'F-IF.2', make() {
  const a = nz(-3, 3), b = nz(-6, 6), c = nz(-9, 9), k = nz(-4, 4), v = a * k * k + b * k + c;
  return { stem: `If ${M(`f(x) = ${coef(a, 'x²')} ${term(b)} ${sg(c)}`)}, find ${M(`f(${neg(k)})`)}.`, correct: neg(v),
    distractors: distinct(neg(v), [neg(-a * k * k + b * k + c), neg(a * 2 * k + b * k + c), neg(a * k * k - b * k + c)]), type: numMaybe(.3), answer: v,
    hints: [`f(${neg(k)}) means: replace every x with ${neg(k)}.`, `Use parentheses: (${neg(k)})² = ${k * k}.`],
    explain: `${a}(${neg(k)})² ${sg(b)}(${neg(k)}) ${sg(c)} = ${neg(a * k * k)} ${sg(b * k)} ${sg(c)} = ${neg(v)}.` };
}},
{ id: 'f-eval-lin', std: 'F-IF.2', make() {
  const m = nz(-6, 6), b = nz(-10, 10), x = nz(-6, 6), v = m * x + b;
  if (Math.random() < .5) return { stem: `If ${M(`g(x) = ${coef(m)} ${sg(b)}`)}, what is ${M(`g(${neg(x)})`)}?`, correct: neg(v), distractors: distinct(neg(v), [neg(m + x + b), neg(-m * x + b), neg(m * x - b)]), type: numMaybe(.4), answer: v,
    hints: [`Replace x with ${neg(x)}.`], explain: `${neg(m)}(${neg(x)}) ${sg(b)} = ${neg(m * x)} ${sg(b)} = ${neg(v)}.` };
  return { stem: `If ${M(`g(x) = ${coef(m)} ${sg(b)}`)}, for what value of <i>x</i> is ${M(`g(x) = ${neg(v)}`)}?`, correct: neg(x), distractors: distinct(neg(x), [neg(v), fmt((v + b) / m), neg(m * v + b)]), type: numMaybe(.4), answer: x,
    hints: ['This time you know the OUTPUT. Set the rule equal to it.', `Solve ${coef(m)} ${sg(b)} = ${neg(v)}.`], explain: `${coef(m)} ${sg(b)} = ${neg(v)} → ${coef(m)} = ${neg(v - b)} → x = ${neg(x)}.` };
}},
{ id: 'f-meaning', std: 'F-IF.2', make() {
  const ctx = pick([['h(t)', 'the height of a ball, in feet, t seconds after it is thrown', 'After', 'seconds, the ball is', 'feet high'], ['C(n)', 'the cost, in dollars, of n tickets to a Jaguars game', 'Buying', 'tickets costs', 'dollars'], ['P(d)', 'the number of pages Ezekiel has read after d days', 'After', 'days, Ezekiel has read', 'pages']]);
  const a = rnd(2, 9), b = rnd(10, 60);
  const right = `${ctx[2]} ${a} ${ctx[3]} ${b} ${ctx[4]}.`;
  return { stem: `${M(ctx[0])} gives ${ctx[1]}. What does ${M(`${ctx[0][0]}(${a}) = ${b}`)} mean?`, correct: right,
    distractors: [`${ctx[2]} ${b} ${ctx[3]} ${a} ${ctx[4]}.`, `The rate of change is ${b / a > 0 ? (b / a).toFixed(1) : b} per unit.`, `${ctx[0][0]} multiplied by ${a} equals ${b}.`], type: 'mc',
    hints: ['In f(input) = output, the number in parentheses is the INPUT.', `So ${a} is the input and ${b} is the output.`], explain: `The input is ${a} and the output is ${b}: ${right}` };
}},
{ id: 'domain-range', std: 'F-IF.5', make() {
  const xs = sample([-4, -2, -1, 0, 1, 3, 5, 6], 4).sort((a, b) => a - b), ys = xs.map(() => rnd(-6, 9));
  const set = a => '{' + [...new Set(a)].sort((p, q) => p - q).map(neg).join(', ') + '}';
  const ask = Math.random() < .5 ? 'domain' : 'range';
  const rel = '{' + xs.map((x, i) => `(${neg(x)}, ${neg(ys[i])})`).join(', ') + '}';
  const c = ask === 'domain' ? set(xs) : set(ys), w = ask === 'domain' ? set(ys) : set(xs);
  const alt = set(xs.concat(ys)), alt2 = set((ask === 'domain' ? xs : ys).slice(0, 3));
  return { stem: `What is the <b>${ask}</b> of ${M(rel)}?`, correct: c, distractors: [w, alt, alt2].filter(z => z !== c).concat(['{all real numbers}']).slice(0, 3), type: 'mc',
    hints: ['Domain = all the INPUTS (x-values). Range = all the OUTPUTS (y-values).', 'List each value once, smallest to largest.'], explain: `The ${ask} is the set of ${ask === 'domain' ? 'x' : 'y'}-values: ${c}.` };
}},
{ id: 'domain-context', std: 'F-IF.5', make() {
  const n = pick([20, 24, 30, 40]);
  return { stem: `A van can carry at most ${n} students on a field trip. Let s(n) be the number of empty seats when n students ride. Which is the most reasonable domain?`,
    correct: `Whole numbers from 0 to ${n}`, distractors: [`All real numbers`, `Numbers from −${n} to ${n}`, `Any decimal from 0 to ${n}`], type: 'mc',
    hints: ['Can you have half a student? A negative number of students?'], explain: `You can only have a whole number of students, from 0 up to ${n}.` };
}},

/* ---------------- UNIT 3 · LINEAR FUNCTIONS ---------------- */
{ id: 'slope-points', std: 'F-IF.6', make() {
  const m = nz(-5, 5), x1 = rnd(-6, 3), dx = rnd(1, 5), y1 = rnd(-8, 8), x2 = x1 + dx, y2 = y1 + m * dx;
  return { stem: `What is the slope of the line through ${M(`(${neg(x1)}, ${neg(y1)})`)} and ${M(`(${neg(x2)}, ${neg(y2)})`)}?`, correct: neg(m),
    distractors: distinct(neg(m), [neg(-m), frac(1, m), frac(-1, m), neg(m * 2)]), type: numMaybe(.3), answer: m,
    hints: ['Slope = change in y ÷ change in x = (y₂ − y₁)/(x₂ − x₁).', `Change in y: ${neg(y2)} − ${paren(y1)} = ${neg(y2 - y1)}.`],
    explain: `m = (${neg(y2)} − ${paren(y1)}) / (${neg(x2)} − ${paren(x1)}) = ${neg(m * dx)}/${dx} = ${neg(m)}.` };
}},
{ id: 'slope-table', std: 'F-IF.6', make() {
  const m = nz(-4, 6), b = rnd(-5, 10), x0 = rnd(0, 2), step = rnd(1, 3), xs = [0, 1, 2, 3].map(i => x0 + i * step);
  const tbl = `<table class="mini"><tr><th>x</th>${xs.map(x => `<td>${x}</td>`).join('')}</tr><tr><th>y</th>${xs.map(x => `<td>${neg(m * x + b)}</td>`).join('')}</tr></table>`;
  return { stem: `What is the rate of change (slope) shown in the table?${tbl}`, correct: neg(m), distractors: distinct(neg(m), [neg(m * step), neg(b), frac(1, m)]), type: numMaybe(.3), answer: m,
    hints: ['How much does y change? How much does x change?', `y changes by ${neg(m * step)} each time x goes up by ${step}.`], explain: `Rate = change in y / change in x = ${neg(m * step)}/${step} = ${neg(m)}.` };
}},
{ id: 'cost-eq', std: 'A-CED.2', make() {
  const f = pick([25, 30, 40, 49, 50, 75]), m = pick([15, 18, 20, 22, 25, 35]);
  const ctx = pick([[`A gym charges a ${money(f)} sign-up fee plus ${money(m)} per month.`, 'n', 'months'], [`A phone plan costs ${money(f)} to activate plus ${money(m)} each month.`, 'n', 'months'], [`A DJ charges ${money(f)} to set up plus ${money(m)} per hour.`, 'h', 'hours']]);
  const u = ctx[1];
  return { stem: `${ctx[0]} Which equation gives the total cost <i>C</i> for <i>${u}</i> ${ctx[2]}?`, correct: `C = ${m}${u} + ${f}`, distractors: [`C = ${f}${u} + ${m}`, `C = ${m + f}${u}`, `C = ${m}(${u} + ${f})`], type: 'mc',
    hints: ['The amount that REPEATS each time goes with the variable (the slope).', 'The one-time fee is the starting amount (the y-intercept).'], explain: `Repeating ${money(m)} → ${m}${u}. One-time ${money(f)} → + ${f}. C = ${m}${u} + ${f}.` };
}},
{ id: 'interpret-slope', std: 'A-CED.2', make() {
  const m = pick([8, 12, 15, 25]), b = pick([30, 40, 60, 100]);
  const c = pick([[`The total cost of a skating party is ${M(`C = ${m}p + ${b}`)}, where p is the number of people.`, `Each person adds ${money(m)} to the cost.`, `The room fee is ${money(b)}.`], [`Ezekiel's savings are ${M(`S = ${m}w + ${b}`)}, where w is weeks.`, `He saves ${money(m)} each week.`, `He started with ${money(b)}.`]]);
  const askSlope = Math.random() < .5;
  return { stem: `${c[0]} What does the <b>${askSlope ? m : b}</b> represent?`, correct: askSlope ? c[1] : c[2], distractors: [askSlope ? c[2] : c[1], `The total after ${m} weeks.`, `The number of people or weeks.`], type: 'mc',
    hints: ['In y = mx + b, m is the rate (per each one) and b is the starting amount.'], explain: askSlope ? `${m} multiplies the variable, so it is the rate: ${c[1]}` : `${b} is the constant, the starting value: ${c[2]}` };
}},
{ id: 'eq-from-table', std: 'F-LE.2', make() {
  const m = nz(-4, 5), b = nz(-6, 8), xs = [0, 1, 2, 3];
  const tbl = `<table class="mini"><tr><th>x</th>${xs.map(x => `<td>${x}</td>`).join('')}</tr><tr><th>y</th>${xs.map(x => `<td>${neg(m * x + b)}</td>`).join('')}</tr></table>`;
  const e = (mm, bb) => `y = ${coef(mm)} ${sg(bb)}`;
  const c = e(m, b);
  return { stem: `Which equation matches the table?${tbl}`, correct: c, distractors: [e(b, m), e(m, -b), e(m + 1, b)].filter(z => z !== c).concat([e(-m, b)]).slice(0, 3), type: 'mc',
    hints: ['b is the y-value when x = 0.', 'm is how much y changes each time x goes up by 1.'], explain: `When x = 0, y = ${neg(b)}, so b = ${neg(b)}. y changes by ${neg(m)} each step, so m = ${neg(m)}. ${c}.` };
}},
{ id: 'point-slope', std: 'F-LE.2', make() {
  const m = nz(-4, 4), x1 = nz(-4, 4), y1 = rnd(-6, 6), b = y1 - m * x1, e = (mm, bb) => `y = ${coef(mm)} ${sg(bb)}`, c = e(m, b);
  return { stem: `Write the equation of the line with slope ${neg(m)} that passes through ${M(`(${neg(x1)}, ${neg(y1)})`)}.`, correct: c, distractors: [e(m, y1), e(m, y1 + m * x1), e(x1, b)].filter(z => z !== c).concat([e(-m, b)]).slice(0, 3), type: 'mc',
    hints: ['Start with y = mx + b and plug in the slope and the point.', `${neg(y1)} = ${neg(m)}(${neg(x1)}) + b. Solve for b.`], explain: `${neg(y1)} = ${neg(m * x1)} + b, so b = ${neg(b)}. ${c}.` };
}},
{ id: 'intercepts', std: 'A-REI.10', make() {
  const m = nz(-5, 5), x0 = nz(-6, 6), b = -m * x0, askX = Math.random() < .6;
  if (askX) return { stem: `What is the <b>x-intercept</b> of ${M(`y = ${coef(m)} ${sg(b)}`)}?`, correct: `(${neg(x0)}, 0)`, distractors: [`(0, ${neg(b)})`, `(${neg(-x0)}, 0)`, `(${neg(b)}, 0)`].filter(z => z !== `(${neg(x0)}, 0)`).slice(0, 3), type: 'mc',
    hints: ['The x-intercept is where the line crosses the x-axis, so y = 0.', `Solve 0 = ${coef(m)} ${sg(b)}.`], explain: `0 = ${coef(m)} ${sg(b)} → x = ${neg(x0)}. The x-intercept is (${neg(x0)}, 0).` };
  return { stem: `What is the <b>y-intercept</b> of ${M(`y = ${coef(m)} ${sg(b)}`)}?`, correct: `(0, ${neg(b)})`, distractors: [`(${neg(x0)}, 0)`, `(0, ${neg(m)})`, `(0, ${neg(-b)})`].filter(z => z !== `(0, ${neg(b)})`).slice(0, 3), type: 'mc',
    hints: ['The y-intercept is where x = 0.', 'In y = mx + b, it is b.'], explain: `When x = 0, y = ${neg(b)}: (0, ${neg(b)}).` };
}},
{ id: 'point-on-line', std: 'A-REI.10', make() {
  const m = nz(-4, 4), b = nz(-6, 6), x = nz(-4, 4), on = `(${neg(x)}, ${neg(m * x + b)})`;
  const off = []; while (off.length < 3) { const xx = nz(-5, 5), yy = m * xx + b + nz(-3, 3), s = `(${neg(xx)}, ${neg(yy)})`; if (s !== on && !off.includes(s)) off.push(s); }
  return { stem: `Which point lies on the graph of ${M(`y = ${coef(m)} ${sg(b)}`)}?`, correct: on, distractors: off, type: 'mc',
    hints: ['Plug each point into the equation.', 'A point is on the line if it makes the equation TRUE.'], explain: `Check ${on}: ${neg(m)}(${neg(x)}) ${sg(b)} = ${neg(m * x + b)} ✓.` };
}},

/* ---------------- UNIT 4 · SYSTEMS ---------------- */
{ id: 'sys-elim', std: 'A-REI.6', make() {
  let x, y; do { x = nz(-7, 7); y = nz(-7, 7); } while (x === y || x === -y);
  const s = x + y, d = x - y;
  return { stem: `Solve the system: ${M(`x + y = ${neg(s)}`)} and ${M(`x − y = ${neg(d)}`)}`, correct: `(${neg(x)}, ${neg(y)})`, distractors: [`(${neg(y)}, ${neg(x)})`, `(${neg(x)}, ${neg(-y)})`, `(${neg(-x)}, ${neg(y)})`], type: 'mc',
    hints: ['Add the two equations — the y-terms cancel.', `2x = ${neg(s + d)}.`, 'Find x, then substitute to find y.'], explain: `Add: 2x = ${neg(s + d)}, x = ${neg(x)}. Then ${neg(x)} + y = ${neg(s)}, y = ${neg(y)}. Check in both equations.` };
}},
{ id: 'sys-sub', std: 'A-REI.6', make() {
  const x = nz(-5, 5), y = nz(-6, 6), m = nz(-3, 3), b = y - m * x, a = rnd(2, 4), c = a * x + y; if (a + m === 0) return this.make();
  return { stem: `Solve by substitution: ${M(`y = ${coef(m)} ${sg(b)}`)} and ${M(`${a}x + y = ${neg(c)}`)}`, correct: `(${neg(x)}, ${neg(y)})`, distractors: [`(${neg(y)}, ${neg(x)})`, `(${neg(x)}, ${neg(b)})`, `(${neg(-x)}, ${neg(m * -x + b)})`].filter(z => z !== `(${neg(x)}, ${neg(y)})`).slice(0, 3), type: 'mc',
    hints: [`Replace y in the second equation with (${coef(m)} ${sg(b)}).`, `${a}x + ${coef(m)} ${sg(b)} = ${neg(c)}. Solve for x.`, 'Then plug x into y = … to find y.'],
    explain: `${a}x + ${coef(m)} ${sg(b)} = ${neg(c)} → ${a + m}x = ${neg(c - b)} → x = ${neg(x)}. y = ${neg(m)}(${neg(x)}) ${sg(b)} = ${neg(y)}.` };
}},
{ id: 'sys-word', std: 'A-REI.6', make() {
  const pa = pick([8, 10, 12]), ps = pick([4, 5, 6]), A = rnd(20, 90), Sn = rnd(30, 120), n = A + Sn, tot = pa * A + ps * Sn;
  return { stem: `The DeSoto Central drama club sold ${n} tickets. Adult tickets cost ${money(pa)} and student tickets cost ${money(ps)}. They collected ${money(tot)}. How many <b>adult</b> tickets were sold?`, correct: String(A),
    distractors: distinct(A, [Sn, Math.round(tot / pa), Math.round(n / 2)]), type: numMaybe(.35), answer: A,
    hints: ['Let a = adult tickets and s = student tickets. Write one equation for TICKETS and one for MONEY.', `a + s = ${n} and ${pa}a + ${ps}s = ${tot}.`, `Substitute s = ${n} − a into the money equation.`],
    explain: `${pa}a + ${ps}(${n} − a) = ${tot} → ${pa - ps}a + ${ps * n} = ${tot} → ${pa - ps}a = ${tot - ps * n} → a = ${A}.` };
}},
{ id: 'sys-count', std: 'A-REI.6', make() {
  const m = nz(-4, 4), b = nz(-6, 6), t = rnd(0, 2);
  let l2, ans;
  if (t === 0) { l2 = `y = ${coef(m)} ${sg(b + nz(1, 4))}`; ans = 'No solution (parallel lines)'; }
  else if (t === 1) { const k = rnd(2, 3); l2 = `${k}y = ${coef(k * m)} ${sg(k * b)}`; ans = 'Infinitely many solutions (same line)'; }
  else { l2 = `y = ${coef(m + nz(1, 3))} ${sg(b)}`; ans = 'Exactly one solution'; }
  return { stem: `How many solutions does this system have? ${M(`y = ${coef(m)} ${sg(b)}`)} and ${M(l2)}`, correct: ans, distractors: ['No solution (parallel lines)', 'Infinitely many solutions (same line)', 'Exactly one solution', 'Exactly two solutions'].filter(z => z !== ans).slice(0, 3), type: 'mc',
    hints: ['Write both equations in y = mx + b form and compare slopes and intercepts.', 'Same slope + different intercept → parallel. Same slope + same intercept → same line. Different slopes → they cross once.'],
    explain: t === 0 ? 'Same slope, different y-intercepts: the lines are parallel and never meet.' : t === 1 ? 'Divide the second equation by its y-coefficient and it is the same line, so every point works.' : 'The slopes are different, so the lines cross at exactly one point.' };
}},
{ id: 'sys-ineq', std: 'A-REI.12', make() {
  const m = nz(-3, 3), b = nz(-4, 4), c = rnd(2, 8);
  const ok = (x, y) => y > m * x + b && y <= c;
  const pts = []; let good = null;
  for (let i = 0; i < 400 && (pts.length < 3 || !good); i++) { const x = rnd(-5, 5), y = rnd(-8, 10), s = `(${neg(x)}, ${neg(y)})`; if (ok(x, y)) { if (!good) good = s; } else if (pts.length < 3 && !pts.includes(s)) pts.push(s); }
  if (!good) return this.make();
  return { stem: `Which point is a solution to BOTH ${M(`y > ${coef(m)} ${sg(b)}`)} and ${M(`y ≤ ${c}`)}?`, correct: good, distractors: pts, type: 'mc',
    hints: ['Test each point in BOTH inequalities.', 'It must make both statements true.'], explain: `${good} makes both inequalities true. Each other point fails at least one.` };
}},

/* ---------------- UNIT 5 · STATISTICS ---------------- */
{ id: 'mean', std: 'S-ID.2', make() {
  const n = rnd(5, 7); const d = Array.from({ length: n }, () => rnd(60, 98)); const r = d.reduce((a, b) => a + b, 0) % n; d[0] -= r;
  const m = d.reduce((a, b) => a + b, 0) / n, so = d.slice().sort((a, b) => a - b);
  return { stem: `Quiz scores: <b>${d.join(', ')}</b>. What is the <b>mean</b>?`, correct: neg(m), distractors: distinct(neg(m), [so[Math.floor(n / 2)], so[n - 1] - so[0], m + 3]), type: numMaybe(.4), answer: m,
    hints: ['Mean = add all values, then divide by how many there are.', `There are ${n} scores.`], explain: `Sum = ${d.reduce((a, b) => a + b, 0)}. ${d.reduce((a, b) => a + b, 0)} ÷ ${n} = ${m}.` };
}},
{ id: 'median-range', std: 'S-ID.2', make() {
  const n = pick([5, 7, 9]); const d = Array.from({ length: n }, () => rnd(2, 40)), so = d.slice().sort((a, b) => a - b), med = so[(n - 1) / 2], rg = so[n - 1] - so[0];
  const ask = Math.random() < .55 ? 'median' : 'range', c = ask === 'median' ? med : rg;
  return { stem: `Points scored by the Jaguars' top scorer in ${n} games: <b>${d.join(', ')}</b>. What is the <b>${ask}</b>?`, correct: String(c),
    distractors: distinct(c, ask === 'median' ? [d[(n - 1) / 2], Math.round(d.reduce((a, b) => a + b, 0) / n), rg] : [so[n - 1], med, so[n - 1] + so[0]]), type: numMaybe(.4), answer: c,
    hints: ask === 'median' ? ['Put the numbers in ORDER first.', 'The median is the middle number.'] : ['Range = largest − smallest.'], explain: ask === 'median' ? `In order: ${so.join(', ')}. The middle value is ${med}.` : `${so[n - 1]} − ${so[0]} = ${rg}.` };
}},
{ id: 'outlier', std: 'S-ID.2', make() {
  const base = Array.from({ length: 5 }, () => rnd(70, 90)), out = pick([5, 12, 150, 200]);
  return { stem: `The data set <b>${base.join(', ')}</b> gets a new value: <b>${out}</b>. Which measure will change the MOST?`, correct: 'The mean', distractors: ['The median', 'The mode', 'None of them change'], type: 'mc',
    hints: ['An outlier is a value far away from the others.', 'Which measure uses every number in its calculation?'], explain: 'The mean adds every value, so one extreme value pulls it a lot. The median barely moves.' };
}},
{ id: 'correlation', std: 'S-ID.6', make() {
  const c = pick([['hours spent studying', 'test scores', 'Positive correlation'], ['outside temperature', 'hot chocolate sales', 'Negative correlation'], ['shoe size', 'favorite number', 'No correlation'], ['minutes of practice', 'free throws made', 'Positive correlation'], ['hours of video games before school', 'hours of sleep', 'Negative correlation'], ['height', 'number of siblings', 'No correlation']]);
  return { stem: `A scatter plot compares <b>${c[0]}</b> and <b>${c[1]}</b>. What type of correlation would you most likely see?`, correct: c[2], distractors: ['Positive correlation', 'Negative correlation', 'No correlation', 'Perfect correlation'].filter(z => z !== c[2]).slice(0, 3), type: 'mc',
    hints: ['Positive: both go UP together. Negative: one goes up while the other goes DOWN. None: no pattern.'], explain: `As ${c[0]} increases, ${c[1]} ${c[2].startsWith('Pos') ? 'tends to increase' : c[2].startsWith('Neg') ? 'tends to decrease' : 'shows no pattern'}: ${c[2].toLowerCase()}.` };
}},
{ id: 'best-fit', std: 'S-ID.7', make() {
  const m = pick([2.5, 3, 4, 5, 1.5]), b = pick([50, 55, 60, 45]), h = rnd(2, 9), v = m * h + b;
  return { stem: `The line of best fit for study hours (x) and test score (y) is ${M(`y = ${m}x + ${b}`)}. Predict the score for ${h} hours of studying.`, correct: fmt(v), distractors: distinct(fmt(v), [fmt(m + h + b), fmt(b * h + m), fmt(m * h)]), type: numMaybe(.5), answer: v,
    hints: [`Plug in x = ${h}.`], explain: `${m}(${h}) + ${b} = ${fmt(m * h)} + ${b} = ${fmt(v)}.` };
}},

/* ---------------- UNIT 6 · EXPONENTS & EXPONENTIAL ---------------- */
{ id: 'exp-rules', std: 'N-RN.2', make() {
  const a = rnd(2, 9), b = rnd(2, 9), t = pick(['prod', 'pow', 'quot']);
  if (t === 'prod') return { stem: `Simplify: ${M(`x<sup>${a}</sup> · x<sup>${b}</sup>`)}`, correct: `x<sup>${a + b}</sup>`, distractors: [`x<sup>${a * b}</sup>`, `2x<sup>${a + b}</sup>`, `x<sup>${Math.abs(a - b) || a + b + 1}</sup>`], type: 'mc',
    hints: ['Same base, MULTIPLYING → ADD the exponents.'], explain: `${a} + ${b} = ${a + b}, so x<sup>${a + b}</sup>.` };
  if (t === 'pow') return { stem: `Simplify: ${M(`(x<sup>${a}</sup>)<sup>${b}</sup>`)}`, correct: `x<sup>${a * b}</sup>`, distractors: [`x<sup>${a + b}</sup>`, `${b}x<sup>${a}</sup>`, `x<sup>${a ** 2 + 1}</sup>`], type: 'mc',
    hints: ['Power of a power → MULTIPLY the exponents.'], explain: `${a} × ${b} = ${a * b}, so x<sup>${a * b}</sup>.` };
  const hi = a + b;
  return { stem: `Simplify: ${M(`x<sup>${hi}</sup> ÷ x<sup>${b}</sup>`)}`, correct: `x<sup>${a}</sup>`, distractors: [`x<sup>${hi + b}</sup>`, `x<sup>${hi * b}</sup>`, `x<sup>${a === b ? a + 1 : b}</sup>`], type: 'mc',
    hints: ['Same base, DIVIDING → SUBTRACT the exponents.'], explain: `${hi} − ${b} = ${a}, so x<sup>${a}</sup>.` };
}},
{ id: 'exp-zero-neg', std: 'N-RN.2', make() {
  const b = pick([2, 3, 4, 5, 10]), e = rnd(1, 3);
  if (Math.random() < .3) { const big = rnd(5, 999); return { stem: `What is the value of ${M(`${big}<sup>0</sup>`)}?`, correct: '1', distractors: ['0', String(big), '−1'], type: 'mc', hints: ['Any nonzero number to the zero power equals 1.'], explain: `Anything (except 0) to the 0 power is 1.` }; }
  const v = '1/' + b ** e;
  return { stem: `What is the value of ${M(`${b}<sup>−${e}</sup>`)}?`, correct: v, distractors: distinct(v, [neg(-(b ** e)), String(b ** e), neg(-b * e)]), type: 'mc',
    hints: ['A negative exponent means "one over" (the reciprocal).', `${b}<sup>−${e}</sup> = 1 / ${b}<sup>${e}</sup>.`], explain: `${b}<sup>−${e}</sup> = 1/${b}<sup>${e}</sup> = 1/${b ** e}.` };
}},
{ id: 'exp-model', std: 'F-LE.1', make() {
  const a = pick([200, 500, 1200, 1500, 2400, 800]), r = pick([3, 4, 5, 6, 8, 12, 15]), grow = Math.random() < .6;
  const thing = grow ? pick([['The population of a town, ', ' people,'], ['A savings account with $', ''], ['A bacteria culture of ', ' cells']]) : pick([['A car worth $', ''], ['A lake with ', ' fish'], ['A phone worth $', '']]);
  const R = (r / 100).toFixed(2), eq = `y = ${a}(1 ${grow ? '+' : '−'} ${R})<sup>t</sup>`;
  return { stem: `${thing[0]}${a.toLocaleString()}${thing[1]} ${grow ? 'grows' : 'decreases'} by ${r}% each year. Which equation models the amount <i>y</i> after <i>t</i> years?`, correct: eq,
    distractors: [`y = ${a}(1 ${grow ? '−' : '+'} ${R})<sup>t</sup>`, `y = ${a} ${grow ? '+' : '−'} ${r}t`, `y = ${a}(${r})<sup>t</sup>`], type: 'mc',
    hints: ['A constant PERCENT change each year is exponential.', `Growth uses (1 + r); decay uses (1 − r). Write ${r}% as ${R}.`], explain: `Exponential ${grow ? 'growth' : 'decay'}: y = a(1 ${grow ? '+' : '−'} r)<sup>t</sup> with r = ${R}: ${eq}.` };
}},
{ id: 'lin-vs-exp', std: 'F-LE.1', make() {
  const kind = pick(['linear', 'exponential']), s = rnd(2, 5), k = kind === 'linear' ? rnd(2, 7) : pick([2, 3]);
  const ys = [s]; for (let i = 1; i < 4; i++) ys.push(kind === 'linear' ? ys[i - 1] + k : ys[i - 1] * k);
  const tbl = `<table class="mini"><tr><th>x</th><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><th>y</th>${ys.map(y => `<td>${y}</td>`).join('')}</tr></table>`;
  const c = kind === 'linear' ? `Linear — y increases by ${k} each time` : `Exponential — y is multiplied by ${k} each time`;
  return { stem: `Which best describes the function in the table?${tbl}`, correct: c,
    distractors: [kind === 'linear' ? `Exponential — y is multiplied by ${k} each time` : `Linear — y increases by ${ys[1] - ys[0]} each time`, 'Neither — there is no pattern', kind === 'linear' ? `Linear — y increases by ${s} each time` : `Exponential — y is multiplied by ${s + k} each time`].filter(z => z !== c), type: 'mc',
    hints: ['Check the differences: is y ADDING the same amount? → linear.', 'Check the ratios: is y MULTIPLYING by the same amount? → exponential.'], explain: kind === 'linear' ? `Each y is ${k} more than the last (constant difference): linear.` : `Each y is ${k} times the last (constant ratio): exponential.` };
}},
{ id: 'exp-eval', std: 'F-LE.1', make() {
  const a = rnd(2, 6), b = pick([2, 3]), t = rnd(2, 4), v = a * b ** t;
  return { stem: `Evaluate ${M(`f(t) = ${a}(${b})<sup>t</sup>`)} for ${M(`t = ${t}`)}.`, correct: String(v), distractors: distinct(v, [(a * b) ** t, a * b * t, a + b ** t]), type: numMaybe(.4), answer: v,
    hints: ['Exponents come BEFORE multiplication.', `First find ${b}<sup>${t}</sup> = ${b ** t}.`], explain: `${b}<sup>${t}</sup> = ${b ** t}; ${a} × ${b ** t} = ${v}.` };
}},

/* ---------------- UNIT 7 · POLYNOMIALS & QUADRATICS ---------------- */
{ id: 'poly-add', std: 'A-APR.1', make() {
  const a = nz(-6, 6), b = nz(-8, 8), c = nz(-9, 9), d = nz(-6, 6), e = nz(-8, 8), f = nz(-9, 9), sub = Math.random() < .5;
  const A = sub ? a - d : a + d, B = sub ? b - e : b + e, C = sub ? c - f : c + f;
  if (!A || !B || !C) return this.make();
  const p = (x, y, z) => `${coef(x, 'x²')} ${term(y)} ${sg(z)}`;
  const ans = p(A, B, C);
  return { stem: `Simplify: ${M(`(${p(a, b, c)}) ${sub ? '−' : '+'} (${p(d, e, f)})`)}`, correct: ans,
    distractors: [p(sub ? a + d : a - d, sub ? b + e : b - e, sub ? c + f : c - f), sub ? p(A, b + e, c - f) : p(A, B, -C), p(A, C, B)].filter(z => z !== ans).slice(0, 3), type: 'mc',
    hints: sub ? ['Subtracting a polynomial: change the sign of EVERY term in the second one.', 'Then combine like terms: x² with x², x with x, numbers with numbers.'] : ['Combine like terms: x² with x², x with x, numbers with numbers.'],
    explain: `x²: ${neg(a)} ${sub ? '−' : '+'} ${paren(d)} = ${neg(A)}; x: ${neg(b)} ${sub ? '−' : '+'} ${paren(e)} = ${neg(B)}; numbers: ${neg(c)} ${sub ? '−' : '+'} ${paren(f)} = ${neg(C)}. Answer: ${ans}.` };
}},
{ id: 'foil', std: 'A-APR.1', make() {
  const p = nz(-8, 8), q = nz(-8, 8); if (p + q === 0) return this.make();
  const f = (B, C) => `x² ${term(B)} ${sg(C)}`, ans = f(p + q, p * q);
  return { stem: `Multiply: ${M(`(x ${sg(p)})(x ${sg(q)})`)}`, correct: ans, distractors: [`x² ${sg(p * q)}`, f(p * q, p + q), f(p + q, -(p * q))].filter(z => z !== ans), type: 'mc',
    hints: ['Use FOIL: First, Outer, Inner, Last.', `Outer + Inner = ${neg(q)}x + ${neg(p)}x.`], explain: `First: x². Outer + Inner: ${neg(q)}x ${sg(p)}x = ${coef(p + q)}. Last: ${neg(p)} × ${paren(q)} = ${neg(p * q)}. Answer: ${ans}.` };
}},
{ id: 'factor-tri', std: 'A-SSE.2', make() {
  let p, q; do { p = nz(-8, 8); q = nz(-8, 8); } while (p + q === 0 || p === q);
  const B = p + q, C = p * q, f = (u, v) => `(x ${sg(u)})(x ${sg(v)})`;
  return { stem: `Factor completely: ${M(`x² ${term(B)} ${sg(C)}`)}`, correct: f(p, q), distractors: [f(-p, -q), f(p, -q), f(-p, q)], type: 'mc',
    hints: [`Find two numbers that MULTIPLY to ${neg(C)} …`, `… and ADD to ${neg(B)}.`, 'Check your answer by multiplying (FOIL).'], explain: `${neg(p)} × ${paren(q)} = ${neg(C)} and ${neg(p)} + ${paren(q)} = ${neg(B)}, so ${f(p, q)}.` };
}},
{ id: 'factor-gcf', std: 'A-SSE.2', make() {
  const g = rnd(2, 6), a = rnd(1, 5), b = nz(-7, 7); if (gcd(a, b) !== 1) return this.make();
  const ans = `${g}x(${coef(a)} ${sg(b)})`;
  return { stem: `Factor out the GCF: ${M(`${g * a}x² ${sg(g * b)}x`)}`, correct: ans, distractors: [`${g}(${coef(a, 'x²')} ${term(b)})`, `x(${g * a}x ${sg(g * b)})`, `${g}x(${coef(a)} ${sg(g * b)})`].filter(z => z !== ans), type: 'mc',
    hints: ['Find the biggest number AND the most x\'s that divide both terms.', `Both terms share ${g} and x.`], explain: `GCF = ${g}x. ${g * a}x² ÷ ${g}x = ${coef(a)}; ${neg(g * b)}x ÷ ${g}x = ${neg(b)}. Answer: ${ans}.` };
}},
{ id: 'diff-squares', std: 'A-SSE.2', make() {
  const k = rnd(2, 12), ans = `(x + ${k})(x − ${k})`;
  return { stem: `Factor: ${M(`x² − ${k * k}`)}`, correct: ans, distractors: [`(x − ${k})²`, `(x + ${k})²`, `(x − ${k * k / (k % 2 ? 1 : 2)})(x + ${k % 2 ? 1 : 2})`].filter(z => z !== ans), type: 'mc',
    hints: ['This is a difference of two perfect squares.', 'a² − b² = (a + b)(a − b).'], explain: `x² − ${k * k} = x² − ${k}² = ${ans}.` };
}},
{ id: 'sqrt-solve', std: 'A-REI.4', make() {
  const r = rnd(2, 12), c = rnd(0, 20), sq = r * r;
  return { stem: `Solve: ${M(c ? `x² + ${c} = ${sq + c}` : `x² = ${sq}`)}`, correct: `x = ${r} or x = −${r}`, distractors: [`x = ${r} only`, `x = ${(sq + c) / 2}`, `x = ${sq} or x = −${sq}`], type: 'mc',
    hints: c ? [`Subtract ${c} first.`, 'Then take the square root — remember BOTH the positive and negative root.'] : ['Take the square root of both sides.', 'Remember BOTH the positive and negative root.'],
    explain: `${c ? `x² = ${sq}. ` : ''}x = ±√${sq} = ±${r}.` };
}},
{ id: 'zero-product', std: 'A-REI.4', make() {
  let p, q; do { p = nz(-9, 9); q = nz(-9, 9); } while (p === q);
  const ans = `x = ${neg(p)} or x = ${neg(-q)}`;
  return { stem: `Solve: ${M(`(x ${sg(-p)})(x ${sg(q)}) = 0`)}`, correct: ans, distractors: [`x = ${neg(-p)} or x = ${neg(q)}`, `x = ${neg(p)} or x = ${neg(q)}`, `x = ${neg(-p)} or x = ${neg(-q)}`].filter(z => z !== ans), type: 'mc',
    hints: ['If two things multiply to 0, one of them must BE 0.', `Set x ${sg(-p)} = 0 and x ${sg(q)} = 0.`], explain: `x ${sg(-p)} = 0 → x = ${neg(p)}; x ${sg(q)} = 0 → x = ${neg(-q)}.` };
}},
{ id: 'factor-solve', std: 'A-REI.4', make() {
  let p, q; do { p = nz(-7, 7); q = nz(-7, 7); } while (p === q || p + q === 0);
  const B = -(p + q), C = p * q, ans = `x = ${neg(Math.min(p, q))} or x = ${neg(Math.max(p, q))}`;
  return { stem: `Solve by factoring: ${M(`x² ${term(B)} ${sg(C)} = 0`)}`, correct: ans, distractors: [`x = ${neg(-Math.min(p, q))} or x = ${neg(-Math.max(p, q))}`, `x = ${neg(p)} or x = ${neg(-q)}`, `x = ${neg(C)} or x = ${neg(B)}`].filter(z => z !== ans).slice(0, 3), type: 'mc',
    hints: ['First factor the trinomial.', 'Then set each factor equal to 0.'], explain: `x² ${term(B)} ${sg(C)} = (x ${sg(-p)})(x ${sg(-q)}) = 0, so ${ans}.` };
}},
{ id: 'vertex', std: 'F-IF.8', make() {
  const a = nz(-3, 3), h = nz(-5, 5), b = -2 * a * h, c = nz(-9, 9), k = a * h * h + b * h + c;
  return { stem: `What is the vertex of ${M(`y = ${coef(a, 'x²')} ${term(b)} ${sg(c)}`)}?`, correct: `(${neg(h)}, ${neg(k)})`, distractors: [`(${neg(-h)}, ${neg(a * h * h - b * h + c)})`, `(${neg(h)}, ${neg(c)})`, `(${neg(b)}, ${neg(c)})`].filter(z => z !== `(${neg(h)}, ${neg(k)})`).slice(0, 3), type: 'mc',
    hints: ['The x-value of the vertex is x = −b / (2a).', `x = −(${neg(b)}) / (2 × ${paren(a)}) = ${neg(h)}.`, 'Plug that x back in to find y.'], explain: `x = −b/2a = ${neg(h)}. y = ${neg(a)}(${neg(h)})² ${sg(b)}(${neg(h)}) ${sg(c)} = ${neg(k)}. Vertex: (${neg(h)}, ${neg(k)}).` };
}},
{ id: 'open-dir', std: 'F-IF.8', make() {
  const a = nz(-4, 4), b = nz(-6, 6), c = nz(-9, 9), up = a > 0;
  return { stem: `Does the parabola ${M(`y = ${coef(a, 'x²')} ${term(b)} ${sg(c)}`)} open up or down, and does it have a maximum or a minimum?`, correct: up ? 'Opens up; it has a minimum' : 'Opens down; it has a maximum',
    distractors: [up ? 'Opens down; it has a maximum' : 'Opens up; it has a minimum', up ? 'Opens up; it has a maximum' : 'Opens down; it has a minimum', 'It is a straight line'], type: 'mc',
    hints: ['Look at the sign of the x² coefficient (a).', 'a > 0 → opens UP (a "smile") with a lowest point. a < 0 → opens DOWN with a highest point.'], explain: `a = ${neg(a)} is ${up ? 'positive, so the parabola opens up and has a minimum' : 'negative, so the parabola opens down and has a maximum'}.` };
}}
];
