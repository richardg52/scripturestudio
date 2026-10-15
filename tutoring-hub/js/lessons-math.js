/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   ALGEBRA I LESSONS — one core lesson per instructional week.
   Fields: week, unit, title, stds, objective, vocab, learn (key ideas),
   examples (worked, revealed step by step), checks (concept checks:
   [question, correct, [wrong], why]), gens (generator ids for guided and
   independent practice), showMe (explain-your-thinking prompt).
   ===================================================================== */
HUB.lessons = HUB.lessons || [];
HUB.lessons.push(
{ id: 'm1', subj: 'math', week: 1, unit: 0, title: 'Adding & Subtracting Integers', stds: ['7.NS.1'], gens: ['int-add', 'int-sub'],
  objective: 'I can add and subtract positive and negative numbers using a number line and the "Keep, Change, Change" rule.',
  vocab: [['integer', 'a whole number that can be positive, negative, or zero'], ['opposite', 'the same distance from 0 on the other side (5 and −5)'], ['absolute value', 'distance from 0, always positive: |−7| = 7']],
  learn: `<p>Negative numbers are everywhere: temperatures below zero, money you owe, yards lost on a football play. Algebra is built on them, so we start here.</p>
  <ul><li><b>Adding a positive</b> → move RIGHT on the number line. <b>Adding a negative</b> → move LEFT.</li>
  <li><b>Same signs:</b> add the numbers and keep the sign. (−4) + (−6) = −10.</li>
  <li><b>Different signs:</b> subtract the smaller absolute value from the larger, and keep the sign of the larger. (−9) + 4 = −5.</li>
  <li><b>Subtracting:</b> Keep the first number, Change − to +, Change the sign of the second number. 3 − (−5) → 3 + 5 = 8.</li></ul>`,
  examples: [{ title: 'Different signs', steps: [['Problem', '−12 + 7'], ['Signs are different, so subtract absolute values', '12 − 7 = 5'], ['Which number is "bigger" (farther from 0)?', '−12, so the answer is negative'], ['Answer', '−5']] },
    { title: 'Subtracting a negative', steps: [['Problem', '−3 − (−8)'], ['Keep, Change, Change', '−3 + 8'], ['Different signs: 8 − 3 = 5, keep the sign of 8', '+5'], ['Answer', '5']] }],
  checks: [['What is −6 + (−4)?', '−10', ['10', '−2', '2'], 'Same signs: add 6 + 4 = 10 and keep the negative sign.'], ['Rewrite 5 − (−2) as addition.', '5 + 2', ['5 + (−2)', '−5 + 2', '5 − 2'], 'Keep 5, change − to +, change −2 to 2.'], ['The temperature is −8°F and rises 11 degrees. What is the new temperature?', '3°F', ['−19°F', '19°F', '−3°F'], '−8 + 11: different signs, 11 − 8 = 3, positive because 11 is larger.']],
  showMe: 'Explain to a 6th grader why subtracting a negative number is the same as adding. Use money or temperature in your example.' },

{ id: 'm2', subj: 'math', week: 2, unit: 0, title: 'Multiplying, Dividing & Order of Operations', stds: ['7.NS.2', '6.EE.2'], gens: ['int-muldiv', 'order-ops', 'evaluate'],
  objective: 'I can multiply and divide integers and simplify expressions in the correct order.',
  vocab: [['product', 'the answer to a multiplication'], ['quotient', 'the answer to a division'], ['PEMDAS', 'Parentheses, Exponents, Multiply/Divide (left to right), Add/Subtract (left to right)']],
  learn: `<p><b>Sign rules for × and ÷:</b> same signs → positive; different signs → negative. (−6)(−3) = 18, but (−6)(3) = −18.</p>
  <p><b>Order of operations</b> keeps everyone getting the same answer:</p>
  <ol><li><b>P</b>arentheses (and other grouping)</li><li><b>E</b>xponents</li><li><b>M</b>ultiply and <b>D</b>ivide — whichever comes first, left to right</li><li><b>A</b>dd and <b>S</b>ubtract — whichever comes first, left to right</li></ol>
  <div class="callout warn">Common trap: (−3)² = 9, but −3² = −9. The parentheses tell you the negative is being squared.</div>`,
  examples: [{ title: 'Order of operations', steps: [['Problem', '20 − 3(6 − 2)²'], ['Parentheses', '20 − 3(4)²'], ['Exponent', '20 − 3(16)'], ['Multiply', '20 − 48'], ['Subtract', '−28']] },
    { title: 'Evaluate an expression', steps: [['Problem: find 2x² − 5y when x = −3, y = 4', '2(−3)² − 5(4)'], ['Exponent first: (−3)² = 9', '2(9) − 5(4)'], ['Multiply', '18 − 20'], ['Subtract', '−2']] }],
  checks: [['What is (−7)(−5)?', '35', ['−35', '−12', '12'], 'Same signs → positive.'], ['What is 10 − 2 × 4?', '2', ['32', '−8', '16'], 'Multiply first: 2 × 4 = 8, then 10 − 8 = 2.'], ['What is (−4)²?', '16', ['−16', '−8', '8'], '(−4)(−4) = 16.']],
  showMe: 'Your friend says 6 + 4 × 2 = 20. Explain the mistake and show the right answer.' },

{ id: 'm3', subj: 'math', week: 3, unit: 0, title: 'Fractions, Percents & Simplifying Expressions', stds: ['5.NF.1', '7.RP.3', '7.EE.1', '7.EE.4'], gens: ['frac-add', 'frac-mul', 'percent', 'like-terms', 'distribute', 'one-step'],
  objective: 'I can work with fractions and percents, combine like terms, use the distributive property, and solve one-step equations.',
  vocab: [['like terms', 'terms with the exact same variable part (3x and −5x)'], ['coefficient', 'the number in front of a variable (7 in 7x)'], ['distributive property', 'a(b + c) = ab + ac'], ['inverse operation', 'the operation that undoes another (+ undoes −, × undoes ÷)']],
  learn: `<p><b>Fractions:</b> to add or subtract, get a common denominator first. To multiply, go straight across. To divide, "Keep, Change, Flip."</p>
  <p><b>Percents:</b> percent means "out of 100." 25% = 0.25. To find 25% of 80: 0.25 × 80 = 20.</p>
  <p><b>Like terms:</b> 4x + 3 − 2x + 5 → (4x − 2x) + (3 + 5) = 2x + 8. You can only combine terms that have the same variable.</p>
  <p><b>Distributive property:</b> multiply the outside number by EVERY term inside: −3(2x − 5) = −6x + 15.</p>
  <p><b>One-step equations:</b> do the inverse operation to both sides. x − 7 = 12 → x = 19.</p>`,
  examples: [{ title: 'Simplify', steps: [['Problem', '5(x − 2) + 3x'], ['Distribute', '5x − 10 + 3x'], ['Group like terms', '(5x + 3x) − 10'], ['Combine', '8x − 10']] },
    { title: 'Sale price', steps: [['A $60 hoodie is 30% off', 'Discount = 0.30 × 60'], ['Find the discount', '$18'], ['Subtract from the price', '60 − 18'], ['Sale price', '$42']] }],
  checks: [['Which are like terms?', '4x and −9x', ['4x and 4', '4x and 4x²', '4x and 4y'], 'Same variable, same exponent.'], ['Simplify 2(x + 6).', '2x + 12', ['2x + 6', 'x + 12', '2x + 8'], 'Multiply 2 by BOTH x and 6.'], ['Solve x/4 = 5.', 'x = 20', ['x = 1.25', 'x = 9', 'x = 1'], 'Multiply both sides by 4.']],
  showMe: 'Explain how you would find the sale price of a $45 pair of shoes that is 20% off. Show every step.' },

{ id: 'm4', subj: 'math', week: 4, unit: 1, title: 'Solving Multi-Step Equations', stds: ['A-REI.3'], gens: ['two-step', 'multi-step'],
  objective: 'I can solve equations that take more than one step by undoing operations in reverse order.',
  vocab: [['equation', 'a statement that two expressions are equal'], ['solution', 'the value that makes the equation true'], ['inverse operations', 'operations that undo each other']],
  learn: `<p>Think of an equation as a balanced scale. Whatever you do to one side, you MUST do to the other.</p>
  <p><b>The 4-step method:</b></p><ol><li><b>Distribute</b> to remove parentheses.</li><li><b>Combine like terms</b> on each side.</li><li><b>Undo addition/subtraction</b> to move the constant.</li><li><b>Undo multiplication/division</b> to get x alone.</li></ol>
  <p>Then <b>CHECK</b> by substituting your answer back into the original equation.</p>`,
  examples: [{ title: 'Multi-step', steps: [['Problem', '3(x − 4) + 2x = 18'], ['Distribute the 3', '3x − 12 + 2x = 18'], ['Combine like terms', '5x − 12 = 18'], ['Add 12 to both sides', '5x = 30'], ['Divide both sides by 5', 'x = 6'], ['CHECK', '3(6 − 4) + 2(6) = 6 + 12 = 18 ✓']] }],
  checks: [['In 4x + 7 = 31, what should you do FIRST?', 'Subtract 7 from both sides', ['Divide both sides by 4', 'Add 7 to both sides', 'Multiply both sides by 4'], 'Undo addition/subtraction before multiplication/division.'], ['After distributing, what is 2(x + 5) = 16?', '2x + 10 = 16', ['2x + 5 = 16', 'x + 10 = 16', '2x + 7 = 16'], '2 × x = 2x and 2 × 5 = 10.'], ['Is x = 3 a solution of 5x − 4 = 11?', 'Yes, because 5(3) − 4 = 11', ['No, because 5(3) − 4 = 19', 'No, because x must be negative', 'Yes, because 5 + 3 − 4 = 4'], 'Substitute and check.']],
  showMe: 'In your own words, explain how you would CHECK that x = 6 is correct for 3(x − 4) + 2x = 18.' },

{ id: 'm5', subj: 'math', week: 5, unit: 1, title: 'Variables on Both Sides, Inequalities & Word Problems', stds: ['A-REI.3', 'A-CED.1', 'A-CED.4', 'N-Q.1'], gens: ['both-sides', 'ineq-flip', 'word-eq', 'special-sol', 'literal', 'units'],
  objective: 'I can solve equations with variables on both sides, solve inequalities, rearrange formulas, and write equations from word problems.',
  vocab: [['inequality', 'a statement using <, >, ≤, or ≥'], ['literal equation', 'a formula with several letters, like d = rt'], ['no solution / infinitely many', 'when the variables cancel and leave a false / true statement']],
  learn: `<p><b>Variables on both sides:</b> move all x-terms to one side first (subtract the smaller one), then solve like a two-step equation.</p>
  <p><b>Inequalities:</b> solve exactly like equations, EXCEPT: when you multiply or divide by a <b>negative</b>, <b>flip the sign</b>.</p>
  <p><b>Word problems:</b> 1) Define the variable. 2) Find the starting amount and the rate. 3) Write the equation. 4) Solve and answer in words with units.</p>
  <p><b>Formulas:</b> to solve d = rt for t, treat d and r like numbers: divide both sides by r → t = d/r.</p>`,
  examples: [{ title: 'Both sides', steps: [['Problem', '7x + 4 = 3x − 12'], ['Subtract 3x from both sides', '4x + 4 = −12'], ['Subtract 4', '4x = −16'], ['Divide by 4', 'x = −4']] },
    { title: 'Inequality with a negative', steps: [['Problem', '−2x + 5 > 13'], ['Subtract 5', '−2x > 8'], ['Divide by −2 and FLIP', 'x < −4'], ['Check with x = −5', '−2(−5) + 5 = 15 > 13 ✓']] },
    { title: 'Word problem', steps: [['Ezekiel has $40 and saves $15 a week. When will he have $130?', 'Let w = weeks'], ['Equation', '40 + 15w = 130'], ['Subtract 40', '15w = 90'], ['Divide by 15', 'w = 6 → in 6 weeks']] }],
  checks: [['When do you flip an inequality sign?', 'When multiplying or dividing by a negative number', ['Every time you subtract', 'When the answer is negative', 'Never'], 'Only multiplying/dividing by a negative flips it.'], ['Solve d = rt for r.', 'r = d/t', ['r = dt', 'r = d − t', 'r = t/d'], 'Divide both sides by t.'], ['In "a taxi charges $3 plus $2 per mile," which number goes with the variable?', '2', ['3', '5', '6'], 'The rate (per mile) multiplies the variable.']],
  showMe: 'Write your OWN word problem about saving money, then write the equation and solve it.' },

{ id: 'm6', subj: 'math', week: 6, unit: 2, title: 'What Is a Function? Domain & Range', stds: ['F-IF.1', 'F-IF.5'], gens: ['is-function', 'domain-range', 'domain-context'],
  objective: 'I can tell whether a relation is a function and identify its domain and range.',
  vocab: [['relation', 'a set of input–output pairs'], ['function', 'a relation where each input has EXACTLY ONE output'], ['domain', 'all the inputs (x-values)'], ['range', 'all the outputs (y-values)']],
  learn: `<p>A function is like a vending machine: press B4 and you always get the same snack. If pressing B4 sometimes gave chips and sometimes gave candy, the machine would be broken — not a function.</p>
  <ul><li>In a set of ordered pairs, look for a repeated <b>x</b> with different <b>y</b>'s → NOT a function.</li><li>On a graph, use the <b>vertical line test</b>: if any vertical line hits the graph twice, it is not a function.</li><li>Outputs CAN repeat. (1, 5) and (2, 5) is fine — two people can buy the same snack.</li></ul>
  <p><b>Domain</b> = inputs. <b>Range</b> = outputs. In real life, think about what makes sense: you can't sell −3 tickets or 2.5 people.</p>`,
  examples: [{ title: 'Function or not?', steps: [['Relation', '{(1, 4), (2, 6), (1, 8)}'], ['Check the x-values', 'x = 1 appears twice'], ['Does it have different outputs?', 'Yes: 4 and 8'], ['Conclusion', 'NOT a function']] },
    { title: 'Domain & range', steps: [['Relation', '{(−2, 5), (0, 3), (4, 5)}'], ['Domain (x-values)', '{−2, 0, 4}'], ['Range (y-values, list once)', '{3, 5}']] }],
  checks: [['Is {(2, 3), (4, 3), (6, 3)} a function?', 'Yes — each x has one output', ['No — the outputs repeat', 'No — it is a straight line', 'Yes — because the x-values are even'], 'Repeated outputs are allowed.'], ['The domain is the set of —', 'inputs (x-values)', ['outputs (y-values)', 'slopes', 'intercepts'], 'Domain = inputs.'], ['Which fails the vertical line test?', 'a circle', ['a straight non-vertical line', 'a U-shaped parabola', 'a horizontal line'], 'A vertical line can cross a circle twice.']],
  showMe: 'Use the vending machine idea to explain to a friend what makes something a function.' },

{ id: 'm7', subj: 'math', week: 7, unit: 2, title: 'Function Notation & Evaluating Functions', stds: ['F-IF.2'], gens: ['f-eval-lin', 'f-eval-quad', 'f-meaning'],
  objective: 'I can evaluate functions written in function notation and explain what f(a) = b means in context.',
  vocab: [['function notation', 'f(x) — read "f of x" — the output when the input is x'], ['evaluate', 'substitute a value and simplify']],
  learn: `<p><b>f(x)</b> does NOT mean f times x. It is a name for the output. f(3) means "the output when the input is 3."</p>
  <ul><li>To find f(3): replace every x with (3) — use parentheses!</li><li>To solve f(x) = 10: set the rule equal to 10 and solve for x.</li><li>In context, <b>C(4) = 52</b> means "4 tickets cost $52." The number in parentheses is always the input.</li></ul>`,
  examples: [{ title: 'Evaluate', steps: [['f(x) = x² − 3x + 2. Find f(−2).', 'f(−2) = (−2)² − 3(−2) + 2'], ['Exponent and multiply', '4 + 6 + 2'], ['Add', 'f(−2) = 12']] },
    { title: 'Work backward', steps: [['g(x) = 4x − 7. When does g(x) = 21?', '4x − 7 = 21'], ['Add 7', '4x = 28'], ['Divide', 'x = 7']] }],
  checks: [['If f(x) = 2x + 1, what is f(5)?', '11', ['7', '10', '16'], '2(5) + 1 = 11.'], ['h(t) is the height of a ball after t seconds. What does h(2) = 30 mean?', 'After 2 seconds, the ball is 30 feet high.', ['After 30 seconds, the ball is 2 feet high.', 'The ball rises 15 feet per second.', 'h times 2 equals 30.'], 'Input = time, output = height.'], ['f(x) is read as —', '"f of x"', ['"f times x"', '"f plus x"', '"f divided by x"'], 'It is notation, not multiplication.']],
  showMe: 'Make up a function for the cost of buying Jaguars game tickets. Explain what C(3) means using your function.' },

{ id: 'm8', subj: 'math', week: 8, unit: 3, title: 'Slope & Rate of Change', stds: ['F-IF.6'], gens: ['slope-points', 'slope-table', 'interpret-slope'],
  objective: 'I can find slope from two points or a table and explain what it means in a real situation.',
  vocab: [['slope (m)', 'rise over run: change in y ÷ change in x'], ['rate of change', 'how much the output changes for each 1 unit of input'], ['positive / negative slope', 'line goes up / down from left to right']],
  learn: `<p>Slope measures steepness: how much y changes when x increases by 1.</p>
  <p><b>Formula:</b> m = (y₂ − y₁) / (x₂ − x₁). Keep the order the same on top and bottom!</p>
  <ul><li>Positive slope → line rises. Negative → falls. Zero → flat (horizontal). Undefined → vertical.</li><li>In real life, slope is a <b>rate</b>: dollars per hour, miles per gallon, points per game.</li></ul>`,
  examples: [{ title: 'Two points', steps: [['Points (2, 3) and (6, 11)', 'm = (11 − 3)/(6 − 2)'], ['Subtract', 'm = 8/4'], ['Simplify', 'm = 2 → y goes up 2 for every 1 x']] },
    { title: 'Negative slope', steps: [['Points (−1, 7) and (3, −5)', 'm = (−5 − 7)/(3 − (−1))'], ['Subtract carefully', 'm = −12/4'], ['Simplify', 'm = −3']] }],
  checks: [['A line goes down from left to right. Its slope is —', 'negative', ['positive', 'zero', 'undefined'], 'Falling = negative.'], ['A plumber charges $40 plus $65 per hour. What is the rate of change?', '$65 per hour', ['$40 per hour', '$105 per hour', '$25 per hour'], 'The per-hour amount is the rate.'], ['What is the slope of a horizontal line?', '0', ['1', 'undefined', '−1'], 'No rise at all.']],
  showMe: 'Explain what a slope of −3 would mean if x is weeks and y is the number of pages left in a book.' },

{ id: 'm10', subj: 'math', week: 10, unit: 3, title: 'Writing & Graphing Linear Equations', stds: ['A-CED.2', 'F-LE.2', 'A-REI.10'], gens: ['cost-eq', 'eq-from-table', 'point-slope', 'intercepts', 'point-on-line'],
  objective: 'I can write a linear equation from a situation, a table, or a point and slope, and identify its intercepts.',
  vocab: [['slope-intercept form', 'y = mx + b'], ['y-intercept (b)', 'the starting value; where the line crosses the y-axis (x = 0)'], ['x-intercept', 'where the line crosses the x-axis (y = 0)']],
  learn: `<p><b>y = mx + b</b> is the most useful equation in Algebra I. m = rate (slope). b = starting amount (y-intercept).</p>
  <ul><li><b>From words:</b> the amount that repeats "per" something is m; the one-time amount is b.</li><li><b>From a table:</b> b is the y-value when x = 0; m is the change in y for each +1 in x.</li><li><b>From a point and slope:</b> plug them into y = mx + b and solve for b.</li><li><b>Intercepts:</b> y-intercept → set x = 0. x-intercept → set y = 0.</li></ul>
  <p>To graph: plot b on the y-axis, then use the slope (rise/run) to find more points.</p>`,
  examples: [{ title: 'From a point and slope', steps: [['Slope 3, through (2, 1)', 'y = 3x + b'], ['Plug in the point', '1 = 3(2) + b'], ['Solve for b', '1 = 6 + b → b = −5'], ['Equation', 'y = 3x − 5']] },
    { title: 'x-intercept', steps: [['y = 2x − 8', 'Set y = 0'], ['0 = 2x − 8', '2x = 8'], ['x = 4', 'x-intercept: (4, 0)']] }],
  checks: [['In y = −4x + 9, what is the y-intercept?', '9', ['−4', '4', '−9'], 'b = 9.'], ['To find the x-intercept, set —', 'y = 0', ['x = 0', 'm = 0', 'b = 0'], 'On the x-axis, y = 0.'], ['A table shows (0, 5), (1, 8), (2, 11). What is the equation?', 'y = 3x + 5', ['y = 5x + 3', 'y = 3x', 'y = 8x + 5'], 'b = 5, y goes up 3 each time.']],
  showMe: 'Describe a real situation from your life that could be modeled by y = 10x + 25. What do the 10 and the 25 mean?' },

{ id: 'm11', subj: 'math', week: 11, unit: 4, title: 'Solving Systems of Equations', stds: ['A-REI.6'], gens: ['sys-elim', 'sys-sub', 'sys-count'],
  objective: 'I can solve a system of two linear equations by elimination or substitution and tell how many solutions it has.',
  vocab: [['system of equations', 'two or more equations with the same variables'], ['solution of a system', 'the point (x, y) that makes BOTH equations true — where the lines cross'], ['elimination', 'add or subtract equations to cancel a variable'], ['substitution', 'replace one variable with an equal expression']],
  learn: `<p>A system asks: where do two lines meet?</p>
  <ul><li><b>Elimination:</b> line up the equations. If one variable has opposite coefficients (like +y and −y), ADD the equations to cancel it.</li><li><b>Substitution:</b> if one equation is already "y = …", plug that expression into the other equation.</li><li>Always find BOTH x and y, then check in BOTH equations.</li></ul>
  <p><b>Number of solutions:</b> different slopes → 1 solution. Same slope, different intercept → parallel → no solution. Same line → infinitely many.</p>`,
  examples: [{ title: 'Elimination', steps: [['x + y = 10 and x − y = 4', 'Add the equations'], ['2x = 14', 'x = 7'], ['Substitute: 7 + y = 10', 'y = 3'], ['Solution', '(7, 3)']] },
    { title: 'Substitution', steps: [['y = 2x + 1 and 3x + y = 16', 'Replace y in the 2nd equation'], ['3x + (2x + 1) = 16', '5x + 1 = 16'], ['5x = 15', 'x = 3'], ['y = 2(3) + 1 = 7', 'Solution (3, 7)']] }],
  checks: [['The solution of a system is where the lines —', 'intersect (cross)', ['are parallel', 'start', 'are steepest'], 'Both equations are true at the crossing point.'], ['y = 2x + 3 and y = 2x − 1 have how many solutions?', 'None', ['One', 'Two', 'Infinitely many'], 'Same slope, different intercepts → parallel.'], ['Which method is easiest for x + y = 8 and x − y = 2?', 'Elimination (add them)', ['Graphing only', 'Guessing', 'Factoring'], '+y and −y cancel when added.']],
  showMe: 'Explain how you know your answer to a system is correct. What do you check?' },

{ id: 'm12', subj: 'math', week: 12, unit: 4, title: 'Systems in the Real World & Systems of Inequalities', stds: ['A-REI.6', 'A-REI.12'], gens: ['sys-word', 'sys-ineq', 'sys-sub'],
  objective: 'I can write and solve systems from word problems and test points in systems of inequalities.',
  vocab: [['constraint', 'a limit, written as an inequality'], ['solution region', 'the area where all inequalities are true']],
  learn: `<p>Most system word problems have TWO facts: a count and a total value.</p>
  <ul><li>Tickets: a + s = total tickets, and (price)a + (price)s = total money.</li><li>Solve by substitution: s = total − a.</li></ul>
  <p><b>Systems of inequalities:</b> a point is a solution only if it makes <b>every</b> inequality true. On a graph, it's in the overlapping shaded region. Dashed line for &lt; or &gt;; solid for ≤ or ≥.</p>`,
  examples: [{ title: 'Tickets', steps: [['200 tickets sold; adults $10, students $5; $1,400 collected', 'a + s = 200 and 10a + 5s = 1400'], ['Substitute s = 200 − a', '10a + 5(200 − a) = 1400'], ['Simplify', '5a + 1000 = 1400 → 5a = 400'], ['Answer', 'a = 80 adult, s = 120 student']] }],
  checks: [['Is (1, 5) a solution of y > 2x and y ≤ 6?', 'Yes — 5 > 2 and 5 ≤ 6', ['No — 5 is not greater than 2', 'No — 5 is greater than 6', 'Yes — only the first is true'], 'Test both.'], ['A boundary line for y ≥ x + 2 is —', 'solid', ['dashed', 'dotted', 'not drawn'], '≥ includes the line.'], ['In a ticket problem, the two equations usually represent —', 'number of tickets and total money', ['adults and students only', 'price and time', 'slope and intercept'], 'Count + value.']],
  showMe: 'Write a ticket problem for a DeSoto Central basketball game and set up (but don\'t have to solve) the system.' },

{ id: 'm13', subj: 'math', week: 13, unit: 5, title: 'Statistics: Center, Spread & Scatter Plots', stds: ['S-ID.2', 'S-ID.6', 'S-ID.7'], gens: ['mean', 'median-range', 'outlier', 'correlation', 'best-fit'],
  objective: 'I can find mean, median, and range, explain how outliers affect them, and interpret scatter plots and lines of best fit.',
  vocab: [['mean', 'average: sum ÷ count'], ['median', 'middle value when ordered'], ['range', 'max − min'], ['outlier', 'a value far from the rest'], ['correlation', 'how two variables move together']],
  learn: `<ul><li><b>Mean</b> uses every value, so outliers pull it. <b>Median</b> is resistant to outliers.</li><li><b>Scatter plots</b> show two variables. Positive correlation: both increase. Negative: one up, one down. None: no pattern.</li><li><b>Line of best fit</b> y = mx + b lets you predict. The slope is the predicted change per unit.</li><li><b>Correlation is not causation:</b> ice cream sales and sunburns rise together because of summer heat — not because ice cream causes sunburn.</li></ul>`,
  examples: [{ title: 'Median', steps: [['Data: 12, 7, 20, 9, 15', 'Order it: 7, 9, 12, 15, 20'], ['Middle value', 'Median = 12'], ['Range', '20 − 7 = 13']] },
    { title: 'Predict', steps: [['Line of fit y = 4x + 62 (x = hours studied)', 'Predict for 5 hours'], ['Substitute', '4(5) + 62'], ['Answer', '82 points']] }],
  checks: [['Which measure is most affected by an outlier?', 'mean', ['median', 'mode', 'none'], 'The mean adds every value.'], ['Hours of practice vs. free throws made likely shows —', 'positive correlation', ['negative correlation', 'no correlation', 'causation proven'], 'More practice, more made shots.'], ['Find the median of 3, 8, 1, 6, 4.', '4', ['6', '3', '4.4'], 'Ordered: 1, 3, 4, 6, 8.']],
  showMe: 'Give an example of two things that are correlated but where one does NOT cause the other.' },

{ id: 'm14', subj: 'math', week: 14, unit: 6, title: 'Exponent Rules & Exponential Functions', stds: ['N-RN.2', 'F-LE.1'], gens: ['exp-rules', 'exp-zero-neg', 'exp-model', 'lin-vs-exp', 'exp-eval'],
  objective: 'I can simplify expressions with exponents and tell the difference between linear and exponential growth.',
  vocab: [['base / exponent', 'in 2⁵, 2 is the base and 5 is the exponent'], ['exponential growth', 'multiplying by the same factor each step'], ['growth / decay factor', '(1 + r) for growth, (1 − r) for decay']],
  learn: `<table class="mini"><tr><th>Rule</th><td>x<sup>a</sup>·x<sup>b</sup> = x<sup>a+b</sup></td><td>x<sup>a</sup>÷x<sup>b</sup> = x<sup>a−b</sup></td><td>(x<sup>a</sup>)<sup>b</sup> = x<sup>ab</sup></td><td>x<sup>0</sup> = 1</td><td>x<sup>−n</sup> = 1/x<sup>n</sup></td></tr></table>
  <p><b>Linear vs. exponential:</b> linear ADDS the same amount each step (+5, +5, +5). Exponential MULTIPLIES by the same factor (×2, ×2, ×2). Exponential always wins eventually.</p>
  <p>Exponential model: <b>y = a(1 ± r)<sup>t</sup></b>, where a is the start and r is the percent as a decimal.</p>`,
  examples: [{ title: 'Simplify', steps: [['(x³)² · x⁴', 'Power of a power: x⁶ · x⁴'], ['Product rule: add exponents', 'x¹⁰']] },
    { title: 'Growth model', steps: [['$500 grows 6% per year', 'a = 500, r = 0.06'], ['Model', 'y = 500(1.06)<sup>t</sup>'], ['After 2 years', '500(1.06)² ≈ $561.80']] }],
  checks: [['x⁵ · x³ = ?', 'x⁸', ['x¹⁵', 'x²', '2x⁸'], 'Add exponents.'], ['A table goes 3, 6, 12, 24. It is —', 'exponential (×2)', ['linear (+3)', 'linear (+6)', 'neither'], 'Each value doubles.'], ['A car loses 15% of its value per year. The factor is —', '0.85', ['1.15', '0.15', '15'], '1 − 0.15 = 0.85.']],
  showMe: 'Would you rather have $1,000 a day for 30 days, or 1 penny doubled every day for 30 days? Explain using what you learned.' },

{ id: 'm15', subj: 'math', week: 15, unit: 7, title: 'Polynomials & Factoring', stds: ['A-APR.1', 'A-SSE.2'], gens: ['poly-add', 'foil', 'factor-gcf', 'factor-tri', 'diff-squares'],
  objective: 'I can add, subtract, and multiply polynomials, and factor expressions using GCF, trinomial, and difference-of-squares patterns.',
  vocab: [['polynomial', 'a sum of terms like 3x² − 5x + 2'], ['binomial / trinomial', 'two terms / three terms'], ['factor', 'to rewrite as a product'], ['GCF', 'greatest common factor']],
  learn: `<ul><li><b>Add/subtract:</b> combine like terms. When subtracting, change the sign of EVERY term in the second polynomial.</li><li><b>Multiply binomials (FOIL):</b> First, Outer, Inner, Last, then combine.</li><li><b>Factor in this order:</b> 1) Pull out a GCF. 2) Difference of squares a² − b² = (a + b)(a − b). 3) Trinomial x² + bx + c: find two numbers that MULTIPLY to c and ADD to b.</li></ul>
  <div class="callout">Factoring is FOIL in reverse. Always check by multiplying back.</div>`,
  examples: [{ title: 'FOIL', steps: [['(x + 3)(x − 7)', 'F: x²   O: −7x   I: 3x   L: −21'], ['Combine', 'x² − 4x − 21']] },
    { title: 'Factor a trinomial', steps: [['x² + 2x − 15', 'Multiply to −15, add to 2'], ['Try pairs: (5, −3)', '5 × −3 = −15, 5 + (−3) = 2 ✓'], ['Answer', '(x + 5)(x − 3)']] }],
  checks: [['(x + 2)(x + 4) = ?', 'x² + 6x + 8', ['x² + 8', 'x² + 6x + 6', 'x² + 8x + 6'], 'FOIL: x² + 4x + 2x + 8.'], ['The GCF of 6x² and 9x is —', '3x', ['3', '6x', '9x²'], '3 divides both; both have at least one x.'], ['x² − 49 factors as —', '(x + 7)(x − 7)', ['(x − 7)²', '(x + 49)(x − 1)', 'x(x − 49)'], 'Difference of squares.']],
  showMe: 'Explain how you would check whether (x + 4)(x − 2) is the correct factoring of x² + 2x − 8.' },

{ id: 'm16', subj: 'math', week: 16, unit: 7, title: 'Solving Quadratics & Their Graphs', stds: ['A-REI.4', 'F-IF.8'], gens: ['sqrt-solve', 'zero-product', 'factor-solve', 'vertex', 'open-dir'],
  objective: 'I can solve quadratic equations by square roots and factoring, and identify the vertex and direction of a parabola.',
  vocab: [['quadratic', 'an equation with x² as the highest power'], ['parabola', 'the U-shaped graph of a quadratic'], ['vertex', 'the highest or lowest point'], ['zeros / roots', 'x-values where y = 0 (x-intercepts)']],
  learn: `<ul><li><b>Square roots:</b> x² = 36 → x = ±6. Never forget the negative!</li><li><b>Zero product property:</b> if (x − 3)(x + 5) = 0, then x − 3 = 0 or x + 5 = 0 → x = 3 or x = −5.</li><li><b>Factoring:</b> get 0 on one side, factor, then use the zero product property.</li><li><b>Graph:</b> y = ax² + bx + c opens UP if a &gt; 0 (minimum) and DOWN if a &lt; 0 (maximum). Vertex x = −b/(2a).</li></ul>`,
  examples: [{ title: 'Solve by factoring', steps: [['x² − x − 12 = 0', 'Factor: (x − 4)(x + 3) = 0'], ['Zero product', 'x − 4 = 0 or x + 3 = 0'], ['Solutions', 'x = 4 or x = −3']] },
    { title: 'Vertex', steps: [['y = x² − 6x + 5', 'a = 1, b = −6'], ['x = −b/(2a)', 'x = 6/2 = 3'], ['y = 9 − 18 + 5', 'y = −4'], ['Vertex', '(3, −4), a minimum']] }],
  checks: [['Solve (x − 2)(x + 9) = 0.', 'x = 2 or x = −9', ['x = −2 or x = 9', 'x = 2 or x = 9', 'x = 18'], 'Set each factor equal to 0.'], ['y = −3x² + 4x + 1 opens —', 'down', ['up', 'left', 'right'], 'a = −3 is negative.'], ['x² = 25 has solutions —', 'x = 5 or x = −5', ['x = 5 only', 'x = 12.5', 'x = 625'], 'Positive AND negative root.']],
  showMe: 'A ball\'s height is a parabola that opens down. Explain what the vertex tells you about the ball.' }
);
