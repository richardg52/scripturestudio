/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   ENGLISH I QUESTION BANK  (MS CCRS Grade 9 Language & Writing)
   Two kinds of entries:
     • Hand-written items:  S(std, stem, correct, [3 wrong], explain, hint)
     • Bank generators:     built from curated word / sentence banks below,
                            so each draw pairs a different example with
                            different distractors.
   ===================================================================== */
HUB.std = Object.assign(HUB.std || {}, {
  'L.7.1': 'Sentence basics: parts of speech & sentence types', 'L.9.1': 'Usage: agreement, pronouns, word choice',
  'L.9.1a': 'Parallel structure', 'L.9.1b': 'Phrases & clauses', 'L.9.2': 'Punctuation: commas, semicolons, colons',
  'W.9.1': 'Argument writing', 'W.9.2': 'Informative writing & transitions', 'L.9.3': 'Formal style & tone',
  'L.9.4': 'Vocabulary: context clues & roots', 'L.9.5': 'Figurative language & connotation',
  'W.9.8': 'Research & credible sources', 'W.9.3': 'Narrative writing', 'W.9.5': 'Revising & editing'
});
HUB.units.eng = [
  { n: 0, title: 'Grammar Foundations', stds: ['L.7.1', 'L.9.1'] },
  { n: 1, title: 'Phrases, Clauses & Parallel Structure', stds: ['L.9.1a', 'L.9.1b'] },
  { n: 2, title: 'Punctuation Power', stds: ['L.9.2'] },
  { n: 3, title: 'Argument Writing', stds: ['W.9.1'] },
  { n: 4, title: 'Informative Writing & Style', stds: ['W.9.2', 'L.9.3'] },
  { n: 5, title: 'Vocabulary & Word Study', stds: ['L.9.4', 'L.9.5'] },
  { n: 6, title: 'Research Skills', stds: ['W.9.8'] },
  { n: 7, title: 'Narrative Writing & Revision', stds: ['W.9.3', 'W.9.5'] }
];

const S = (std, stem, correct, distractors, explain, hint) => ({ std, stem, correct, distractors, explain, hints: hint ? [hint] : [] });

/* ---------------- Curated banks ---------------- */
const POS_BANK = [
  ['The <u>tired</u> players walked slowly off the field.', 'adjective', 'It describes the noun "players."'],
  ['The players walked <u>slowly</u> off the field.', 'adverb', 'It tells HOW they walked (describes the verb).'],
  ['Ezekiel <u>sprinted</u> to catch the bus.', 'verb', 'It is the action Ezekiel did.'],
  ['The <u>library</u> closes at eight tonight.', 'noun', 'It names a place.'],
  ['<u>She</u> finished the essay before lunch.', 'pronoun', 'It takes the place of a person\'s name.'],
  ['The keys were <u>under</u> the couch cushion.', 'preposition', 'It shows the relationship between "keys" and "couch cushion."'],
  ['I wanted to go, <u>but</u> I had practice.', 'conjunction', 'It joins two ideas.'],
  ['Our coach is <u>extremely</u> proud of the team.', 'adverb', 'It describes the adjective "proud" (how proud?).'],
  ['The band played a <u>loud</u> song at halftime.', 'adjective', 'It describes the noun "song."'],
  ['<u>Courage</u> is doing the right thing when it is hard.', 'noun', 'It names an idea (abstract noun).'],
  ['They <u>will travel</u> to Jackson for the tournament.', 'verb', 'It is the action (a verb phrase).'],
  ['Marcus sat <u>between</u> his two cousins.', 'preposition', 'It shows where Marcus sat in relation to his cousins.'],
  ['Please give the book to <u>them</u>.', 'pronoun', 'It replaces the names of people.'],
  ['The storm passed <u>quickly</u>.', 'adverb', 'It tells HOW the storm passed.'],
  ['Neither the coach <u>nor</u> the players expected rain.', 'conjunction', 'It joins "the coach" and "the players" (neither…nor).'],
  ['The <u>shiny</u> trophy sat in the front office.', 'adjective', 'It describes "trophy."'],
  ['The class <u>celebrated</u> after the test.', 'verb', 'It is the action the class did.'],
  ['We ate lunch <u>after</u> the assembly.', 'preposition', 'It connects "lunch" to "the assembly" and shows time.'],
  ['<u>Freedom</u> was the main idea of the speech.', 'noun', 'It names an idea.'],
  ['Tasha <u>carefully</u> checked her answers.', 'adverb', 'It tells HOW she checked.']
];
const POS_ALL = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction'];

const SENT_BANK = [
  ['Because the bus was late this morning.', 'fragment'], ['Running down the hallway to class.', 'fragment'], ['After the game on Friday night.', 'fragment'], ['The tall boy with the red backpack.', 'fragment'],
  ['Which made everyone laugh.', 'fragment'], ['Although she studied for hours.', 'fragment'], ['For example, the long lines at lunch.', 'fragment'],
  ['The bell rang everyone rushed to the door.', 'run-on'], ['I finished my homework I went outside to shoot hoops.', 'run-on'], ['The movie was long we still enjoyed it.', 'run-on'], ['My phone died I could not call my mom.', 'run-on'],
  ['It started to rain, we went inside.', 'comma splice'], ['The test was hard, I think I passed.', 'comma splice'], ['Jordan loves to draw, he wants to be an artist.', 'comma splice'], ['The team practiced all week, they won on Friday.', 'comma splice'],
  ['The bus was late this morning.', 'complete sentence'], ['Because the bus was late, we missed first period.', 'complete sentence'], ['Ezekiel studied hard, and he passed the quiz.', 'complete sentence'],
  ['After the game, the fans cheered loudly.', 'complete sentence'], ['The storm knocked out the power; we used flashlights.', 'complete sentence'], ['Run!', 'complete sentence'], ['Although it was cold, we stayed for the whole game.', 'complete sentence']
];
const SENT_TYPES = ['complete sentence', 'fragment', 'run-on', 'comma splice'];
const SENT_FIX = { fragment: 'It is missing a subject, a verb, or a complete thought — it cannot stand alone.', 'run-on': 'Two complete sentences are jammed together with no punctuation or joining word.', 'comma splice': 'Two complete sentences are joined with only a comma. Use a period, a semicolon, or a comma + FANBOYS word.', 'complete sentence': 'It has a subject, a verb, and a complete thought.' };

const STRUCT_BANK = [
  ['Ezekiel plays basketball.', 'simple'], ['The library opens early on Saturdays.', 'simple'], ['After school, my cousins and I walked to the park.', 'simple'], ['The Jaguars won the game.', 'simple'],
  ['I wanted pizza, but my sister wanted tacos.', 'compound'], ['The rain stopped, so we went outside.', 'compound'], ['Tasha studied; she earned an A.', 'compound'], ['We can take the bus, or Mom can drive us.', 'compound'],
  ['When the bell rang, students rushed out.', 'complex'], ['I will call you after I finish practice.', 'complex'], ['The book that I borrowed is overdue.', 'complex'], ['Because it was raining, the game was delayed.', 'complex'],
  ['When the power went out, we lit candles, and we told stories.', 'compound-complex'], ['I studied because the test was hard, but I still felt nervous.', 'compound-complex'], ['Although we were tired, we finished the project, and our teacher was impressed.', 'compound-complex']
];
const STRUCT_EXPLAIN = { simple: 'one independent clause', compound: 'two independent clauses joined', complex: 'one independent clause + at least one dependent clause', 'compound-complex': 'two or more independent clauses + at least one dependent clause' };

const FIG_BANK = [
  ['The hallway was a river of students rushing to lunch.', 'metaphor'], ['Her smile was as bright as the stadium lights.', 'simile'], ['The old truck coughed and groaned up the hill.', 'personification'],
  ['I have told you a million times to clean your room.', 'hyperbole'], ['The buzz of the bees filled the garden.', 'onomatopoeia'], ['Sally sells seashells by the seashore.', 'alliteration'],
  ['That test was a piece of cake.', 'idiom'], ['The silence was deafening.', 'oxymoron'], ['He ran like the wind to catch the bus.', 'simile'], ['The classroom was a zoo after the fire drill.', 'metaphor'],
  ['The wind whispered through the pine trees.', 'personification'], ['My backpack weighs a ton.', 'hyperbole'], ['Crack! The bat hit the ball over the fence.', 'onomatopoeia'], ['Big brown bears bounce on blue balloons.', 'alliteration'],
  ['It is raining cats and dogs.', 'idiom'], ['We enjoyed the jumbo shrimp at the fish fry.', 'oxymoron'], ['Life is a highway.', 'metaphor'], ['The leaves danced across the parking lot.', 'personification'],
  ['Her voice was as smooth as honey.', 'simile'], ['I am so hungry I could eat a horse.', 'hyperbole'], ['The sun smiled down on the Delta.', 'personification'], ['Time is money.', 'metaphor'],
  ['The fire alarm went off — beep, beep, beep!', 'onomatopoeia'], ['Break a leg at your performance tonight!', 'idiom'], ['The car was as quiet as a mouse.', 'simile'], ['Peter Piper picked a peck of pickled peppers.', 'alliteration'],
  ['It was an open secret that Coach was retiring.', 'oxymoron'], ['The stars winked at us from the night sky.', 'personification'], ['His heart was a stone.', 'metaphor'], ['This line is so long it reaches Memphis.', 'hyperbole']
];
const FIG_ALL = ['simile', 'metaphor', 'personification', 'hyperbole', 'onomatopoeia', 'alliteration', 'idiom', 'oxymoron'];
const FIG_DEF = { simile: 'compares two things using "like" or "as"', metaphor: 'compares two things by saying one IS the other', personification: 'gives human actions or feelings to something non-human', hyperbole: 'is an extreme exaggeration', onomatopoeia: 'is a word that imitates a sound', alliteration: 'repeats the same beginning consonant sound', idiom: 'is a saying whose meaning is different from its literal words', oxymoron: 'puts two opposite words together' };

/* word, part of speech, definition, context sentence (with a clue) */
const VOCAB = [
  ['abundant', 'adj', 'more than enough; plentiful', 'After the rain, the crops were <b>abundant</b>, so the farmers had plenty to sell.'],
  ['adamant', 'adj', 'firm and unwilling to change one\'s mind', 'Coach was <b>adamant</b> that nobody would skip practice, and he refused every excuse.'],
  ['ambiguous', 'adj', 'open to more than one meaning; unclear', 'Her answer was so <b>ambiguous</b> that half the class thought she meant yes and half thought no.'],
  ['analyze', 'verb', 'to examine closely to understand the parts', 'We had to <b>analyze</b> the poem line by line to understand how it was built.'],
  ['anticipate', 'verb', 'to expect or look forward to', 'Fans <b>anticipate</b> a huge crowd for the homecoming game, so they are arriving early.'],
  ['arduous', 'adj', 'very difficult and tiring', 'The <b>arduous</b> hike up the steep trail left everyone exhausted.'],
  ['benevolent', 'adj', 'kind and generous', 'The <b>benevolent</b> neighbor bought school supplies for every kid on the street.'],
  ['candid', 'adj', 'honest and direct', 'My aunt gave a <b>candid</b> opinion: she told me exactly what she thought of my essay.'],
  ['coherent', 'adj', 'logical and clearly connected', 'His speech was <b>coherent</b>; every point followed clearly from the last.'],
  ['concise', 'adj', 'short but complete; using few words', 'Keep your answer <b>concise</b> — two sentences, not two pages.'],
  ['consequence', 'noun', 'a result of an action', 'Missing practice had a <b>consequence</b>: he sat out the first quarter.'],
  ['contradict', 'verb', 'to say the opposite of', 'The witness\'s second story seemed to <b>contradict</b> what she said the first time.'],
  ['credible', 'adj', 'believable; trustworthy', 'A report from the CDC is more <b>credible</b> than a random post online.'],
  ['deteriorate', 'verb', 'to become worse over time', 'Without repairs, the old bridge began to <b>deteriorate</b> and crack.'],
  ['diligent', 'adj', 'hardworking and careful', 'Because she was <b>diligent</b>, Imani checked every problem twice.'],
  ['diminish', 'verb', 'to make or become smaller', 'The crowd began to <b>diminish</b> as people left before the final buzzer.'],
  ['eloquent', 'adj', 'well-spoken and persuasive', 'The <b>eloquent</b> speaker moved the audience to tears with her words.'],
  ['emphasize', 'verb', 'to give special importance to', 'The teacher underlined the date to <b>emphasize</b> that the essay was due Friday.'],
  ['evident', 'adj', 'clear; easy to see', 'It was <b>evident</b> that he had practiced, because he played every note perfectly.'],
  ['feasible', 'adj', 'possible to do', 'Building a new gym by Monday is not <b>feasible</b>; it would take at least a year.'],
  ['fluctuate', 'verb', 'to rise and fall; change often', 'Gas prices <b>fluctuate</b> — up one week, down the next.'],
  ['frugal', 'adj', 'careful not to waste money', 'Being <b>frugal</b>, Grandma reused every jar and never bought what she didn\'t need.'],
  ['hostile', 'adj', 'unfriendly; showing anger', 'The crowd turned <b>hostile</b>, booing and shouting at the referee.'],
  ['hypothesis', 'noun', 'an educated guess that can be tested', 'Her <b>hypothesis</b> was that plants grow faster with music; she tested it for two weeks.'],
  ['illuminate', 'verb', 'to light up or make clear', 'The headlights <b>illuminate</b> the dark road ahead.'],
  ['imply', 'verb', 'to suggest without saying directly', 'When Mom looked at the dishes, she seemed to <b>imply</b> I should wash them.'],
  ['indifferent', 'adj', 'not caring one way or the other', 'He was <b>indifferent</b> about where we ate; any place was fine with him.'],
  ['inevitable', 'adj', 'certain to happen; unavoidable', 'With dark clouds everywhere, rain seemed <b>inevitable</b>.'],
  ['infer', 'verb', 'to figure out from clues', 'From the wet umbrella by the door, I could <b>infer</b> that it had rained.'],
  ['integrity', 'noun', 'honesty and strong moral principles', 'Showing <b>integrity</b>, he returned the wallet with all the money inside.'],
  ['meticulous', 'adj', 'extremely careful about details', 'The <b>meticulous</b> artist spent hours on every tiny line.'],
  ['mundane', 'adj', 'ordinary; dull', 'Folding laundry is a <b>mundane</b> chore, nothing exciting about it.'],
  ['negligent', 'adj', 'failing to take proper care', 'The <b>negligent</b> driver ignored the stop sign and caused a crash.'],
  ['objective', 'adj', 'based on facts, not feelings', 'A reporter should stay <b>objective</b> and report facts, not personal opinions.'],
  ['obsolete', 'adj', 'no longer used; out of date', 'Flip phones are nearly <b>obsolete</b> now that almost everyone has a smartphone.'],
  ['ominous', 'adj', 'threatening; signaling something bad', 'The <b>ominous</b> green sky warned us a tornado might be coming.'],
  ['perceive', 'verb', 'to notice or become aware of', 'Dogs can <b>perceive</b> sounds that humans cannot hear.'],
  ['persevere', 'verb', 'to keep going despite difficulty', 'Even after failing twice, she chose to <b>persevere</b> and passed on the third try.'],
  ['plausible', 'adj', 'reasonable; possibly true', 'His excuse was <b>plausible</b> — the bus really had broken down that morning.'],
  ['pragmatic', 'adj', 'practical; focused on what works', 'Instead of complaining, she took a <b>pragmatic</b> approach and fixed the problem.'],
  ['prevalent', 'adj', 'widespread; common', 'Allergies are <b>prevalent</b> in the spring, when almost everyone is sneezing.'],
  ['profound', 'adj', 'very deep or meaningful', 'The veteran\'s story had a <b>profound</b> effect on the whole class.'],
  ['reluctant', 'adj', 'unwilling; hesitant', 'Ezekiel was <b>reluctant</b> to read aloud, but he finally agreed.'],
  ['resilient', 'adj', 'able to recover quickly from difficulty', 'The <b>resilient</b> town rebuilt quickly after the hurricane.'],
  ['scrutinize', 'verb', 'to examine very closely', 'The referee watched the replay to <b>scrutinize</b> every second of the play.'],
  ['skeptical', 'adj', 'doubtful; not easily convinced', 'I was <b>skeptical</b> of the ad that promised to make me rich overnight.'],
  ['subtle', 'adj', 'not obvious; delicate', 'The change was so <b>subtle</b> that almost nobody noticed.'],
  ['substantial', 'adj', 'large in amount or importance', 'The donation was <b>substantial</b> — enough to buy new uniforms for every team.'],
  ['tedious', 'adj', 'long, slow, and boring', 'Copying the dictionary by hand would be a <b>tedious</b> job.'],
  ['tenacious', 'adj', 'holding on firmly; determined', 'The <b>tenacious</b> defender never let the other team\'s star get open.'],
  ['transparent', 'adj', 'easy to see through; open and honest', 'The principal was <b>transparent</b> about the budget and shared every number.'],
  ['ubiquitous', 'adj', 'found everywhere', 'Phones are <b>ubiquitous</b> in schools — you see them in every hallway.'],
  ['undermine', 'verb', 'to weaken gradually or secretly', 'Constant rumors began to <b>undermine</b> the team\'s trust in each other.'],
  ['valid', 'adj', 'logical; well-supported', 'She made a <b>valid</b> point, backed up with strong evidence.'],
  ['vivid', 'adj', 'bright and clear; full of detail', 'The writer\'s <b>vivid</b> description made me feel like I was standing on the beach.'],
  ['vulnerable', 'adj', 'open to harm or attack', 'Without a coat, the puppy was <b>vulnerable</b> to the freezing wind.'],
  ['advocate', 'verb', 'to publicly support', 'Students <b>advocate</b> for a later start time by speaking at board meetings.'],
  ['allude', 'verb', 'to refer to indirectly', 'The speaker seemed to <b>allude</b> to the flood without naming it.'],
  ['bias', 'noun', 'an unfair preference for one side', 'The article showed <b>bias</b> because it only gave one side of the story.'],
  ['compel', 'verb', 'to force or strongly push someone to act', 'The heavy rain will <b>compel</b> the officials to postpone the game.'],
  ['comprehensive', 'adj', 'complete; including everything', 'The <b>comprehensive</b> review covered every chapter of the book.'],
  ['convey', 'verb', 'to communicate or express', 'Her tone helped <b>convey</b> how disappointed she really was.'],
  ['endure', 'verb', 'to put up with something hard', 'The runners had to <b>endure</b> the heat for all twenty-six miles.'],
  ['enhance', 'verb', 'to improve or make better', 'Adding examples will <b>enhance</b> your essay and make it stronger.'],
  ['futile', 'adj', 'useless; having no effect', 'Trying to stop the flood with one sandbag was <b>futile</b>.'],
  ['impartial', 'adj', 'fair; not favoring one side', 'A judge must be <b>impartial</b> and treat both sides the same.'],
  ['notorious', 'adj', 'famous for something bad', 'The intersection is <b>notorious</b> for accidents.'],
  ['novice', 'noun', 'a beginner', 'As a <b>novice</b>, he was still learning the basic chess moves.'],
  ['obstacle', 'noun', 'something that blocks progress', 'The fallen tree was an <b>obstacle</b> in the middle of the road.'],
  ['revere', 'verb', 'to deeply respect', 'Many people <b>revere</b> Fannie Lou Hamer for her courage.'],
  ['significant', 'adj', 'important; meaningful', 'Passing Algebra I is a <b>significant</b> step toward graduation.'],
  ['sufficient', 'adj', 'enough', 'Two hours of study should be <b>sufficient</b> for a short quiz.'],
  ['thrive', 'verb', 'to grow strongly; to succeed', 'Plants <b>thrive</b> when they get plenty of sun and water.'],
  ['verify', 'verb', 'to check that something is true', 'Always <b>verify</b> a fact with a second source before using it.'],
  ['zealous', 'adj', 'very enthusiastic and devoted', 'The <b>zealous</b> fans painted their faces purple and gold for every game.']
];

const ROOTS = [
  ['bio', 'life', 'biology'], ['chron', 'time', 'chronological'], ['graph', 'write', 'autograph'], ['tele', 'far', 'telephone'], ['port', 'carry', 'transport'],
  ['dict', 'say; speak', 'predict'], ['spect', 'look; see', 'inspect'], ['struct', 'build', 'construct'], ['rupt', 'break', 'erupt'], ['scrib/script', 'write', 'manuscript'],
  ['ben/bene', 'good', 'benefit'], ['mal', 'bad', 'malfunction'], ['aud', 'hear', 'audience'], ['vid/vis', 'see', 'visible'], ['therm', 'heat', 'thermometer'],
  ['photo', 'light', 'photograph'], ['geo', 'earth', 'geography'], ['hydr', 'water', 'hydrate'], ['ject', 'throw', 'reject'], ['tract', 'pull; drag', 'tractor'],
  ['pre-', 'before', 'preview'], ['re-', 'again; back', 'rewrite'], ['un-', 'not', 'unfair'], ['mis-', 'wrongly', 'misspell'], ['inter-', 'between', 'interstate'],
  ['sub-', 'under; below', 'submarine'], ['trans-', 'across', 'transatlantic'], ['anti-', 'against', 'antibiotic'], ['-less', 'without', 'fearless'], ['-ology', 'study of', 'geology'],
  ['-ful', 'full of', 'hopeful'], ['-able/-ible', 'able to be', 'readable'], ['cred', 'believe', 'incredible'], ['phon', 'sound', 'symphony'], ['ped/pod', 'foot', 'pedestrian']
];

const TRANS = [
  ['The river flooded the farmland.', 'many families had to move.', 'As a result', 'cause and effect'],
  ['Ezekiel studied for two hours.', 'he still felt nervous about the test.', 'However', 'contrast'],
  ['Many students join clubs at DeSoto Central.', 'the robotics team has over thirty members.', 'For example', 'example'],
  ['First, preheat the oven.', 'mix the dry ingredients.', 'Next', 'sequence'],
  ['Exercise strengthens your heart.', 'it improves your mood.', 'In addition', 'addition'],
  ['The city wanted a new park.', 'it did not have enough money.', 'Unfortunately', 'contrast'],
  ['The team practiced every day.', 'they won the championship.', 'Consequently', 'cause and effect'],
  ['Some people prefer cats.', 'others would rather have dogs.', 'On the other hand', 'contrast'],
  ['Mississippi has many famous musicians.', 'B.B. King was born near Itta Bena.', 'For instance', 'example'],
  ['Wash the car with soap.', 'rinse it with clean water.', 'Then', 'sequence'],
  ['Phones can distract students.', 'they can also be useful learning tools.', 'Nevertheless', 'contrast'],
  ['Reading every day builds vocabulary.', 'it improves your writing.', 'Furthermore', 'addition'],
  ['The power was out for three days.', 'the food in the refrigerator spoiled.', 'Therefore', 'cause and effect'],
  ['The evidence shows sleep matters for learning.', 'schools should consider later start times.', 'In conclusion', 'conclusion']
];
const TRANS_GROUPS = { 'cause and effect': ['As a result', 'Consequently', 'Therefore'], contrast: ['However', 'On the other hand', 'Nevertheless', 'Unfortunately'], example: ['For example', 'For instance'], sequence: ['Next', 'Then', 'Finally'], addition: ['In addition', 'Furthermore', 'Also'], conclusion: ['In conclusion', 'Overall'] };

/* ---------------- Generators ---------------- */
const GEN = [
  { id: 'pos', std: 'L.7.1', count: POS_BANK.length, make() { const [s, a, why] = pick(POS_BANK);
    return { stem: `What part of speech is the underlined word?<div class="quote">${s}</div>`, correct: a, distractors: sample(POS_ALL.filter(p => p !== a), 3),
      hints: ['Noun = person/place/thing/idea. Verb = action/being. Adjective describes a noun. Adverb describes a verb/adjective (often -ly).'], explain: `<b>${a}</b>: ${why}` }; } },
  { id: 'sent-type', std: 'L.7.1', count: SENT_BANK.length, make() { const [s, a] = pick(SENT_BANK);
    return { stem: `Is this a complete sentence, a fragment, a run-on, or a comma splice?<div class="quote">${s}</div>`, correct: a, distractors: SENT_TYPES.filter(t => t !== a),
      hints: ['Count the complete thoughts. Zero (or an unfinished one) = fragment. Two jammed together = run-on or comma splice.'], explain: `<b>${a}</b>: ${SENT_FIX[a]}` }; } },
  { id: 'sent-struct', std: 'L.7.1', count: STRUCT_BANK.length, make() { const [s, a] = pick(STRUCT_BANK);
    return { stem: `What kind of sentence is this?<div class="quote">${s}</div>`, correct: a, distractors: ['simple', 'compound', 'complex', 'compound-complex'].filter(t => t !== a),
      hints: ['Find the independent clauses (can stand alone) and dependent clauses (start with words like because, when, although, that).'], explain: `<b>${a}</b>: ${STRUCT_EXPLAIN[a]}.` }; } },
  { id: 'fig', std: 'L.9.5', count: FIG_BANK.length, make() { const [s, a] = pick(FIG_BANK);
    return { stem: `Which type of figurative language is used?<div class="quote">${s}</div>`, correct: a, distractors: sample(FIG_ALL.filter(f => f !== a), 3),
      hints: ['Look for "like/as" (simile), exaggeration (hyperbole), human traits (personification), sound words (onomatopoeia), repeated first sounds (alliteration).'], explain: `<b>${a}</b> — it ${FIG_DEF[a]}.` }; } },
  { id: 'vocab-ctx', std: 'L.9.4', count: VOCAB.length, make() { const w = pick(VOCAB), others = sample(VOCAB.filter(v => v !== w && v[1] === w[1]), 3);
    return { stem: `Read the sentence. What does <b>${w[0]}</b> most likely mean?<div class="quote">${w[3]}</div>`, correct: w[2], distractors: others.map(o => o[2]),
      hints: ['Look for a context clue: a definition, an example, a synonym, or a contrast nearby in the sentence.'], explain: `<b>${w[0]}</b> means "${w[2]}." The rest of the sentence gives the clue.` }; } },
  { id: 'vocab-word', std: 'L.9.4', count: VOCAB.length, make() { const w = pick(VOCAB), others = sample(VOCAB.filter(v => v !== w && v[1] === w[1]), 3);
    return { stem: `Which word means "<b>${w[2]}</b>"?`, correct: w[0], distractors: others.map(o => o[0]),
      hints: ['Try each word in a sentence and see which one fits the meaning.'], explain: `<b>${w[0]}</b>: ${w[3].replace(/<\/?b>/g, '')}` }; } },
  { id: 'root-mean', std: 'L.9.4', count: ROOTS.length, make() { const r = pick(ROOTS), others = sample(ROOTS.filter(x => x !== r), 3);
    return { stem: `The word part <b>${r[0]}</b> (as in <i>${r[2]}</i>) means —`, correct: r[1], distractors: others.map(o => o[1]),
      hints: [`Think about what "${r[2]}" means and what part ${r[0]} plays in it.`], explain: `<b>${r[0]}</b> means "${r[1]}" — as in <i>${r[2]}</i>.` }; } },
  { id: 'root-word', std: 'L.9.4', count: ROOTS.length, make() { const r = pick(ROOTS), others = sample(ROOTS.filter(x => x !== r && x[1] !== r[1]), 3);
    return { stem: `Which word contains a word part meaning "<b>${r[1]}</b>"?`, correct: r[2], distractors: others.map(o => o[2]),
      hints: ['Break each word into its parts (prefix, root, suffix).'], explain: `<i>${r[2]}</i> contains <b>${r[0]}</b>, which means "${r[1]}."` }; } },
  { id: 'transition', std: 'W.9.2', count: TRANS.length, make() { const t = pick(TRANS); const wrongGroups = Object.keys(TRANS_GROUPS).filter(g => g !== t[3]);
    return { stem: `Which transition best connects the ideas?<div class="quote">${t[0]} ______, ${t[1]}</div>`, correct: t[2], distractors: sample(wrongGroups, 3).map(g => pick(TRANS_GROUPS[g])),
      hints: ['Ask: how is the second idea related to the first? Is it a result? A contrast? An example? The next step?'], explain: `The relationship is <b>${t[3]}</b>, so "${t[2]}" fits.` }; } }
];

/* ---------------- Hand-written items ---------------- */
const ENG_STATIC = [
  // L.9.1 usage
  S('L.9.1', 'Choose the sentence with correct subject–verb agreement.', 'Each of the players has a new jersey.', ['Each of the players have a new jersey.', 'Each of the players are getting new jerseys.', 'Each of the players were given new jerseys.'], '"Each" is the singular subject; "of the players" is just a phrase. Singular subject → singular verb "has."', 'Cross out the prepositional phrase "of the players." What is left?'),
  S('L.9.1', 'Choose the correct verb: "The box of old trophies ___ in the gym office."', 'sits', ['sit', 'are sitting', 'have sat'], 'The subject is "box" (singular), not "trophies." Singular subject → "sits."', 'What is actually sitting — the box or the trophies?'),
  S('L.9.1', 'Choose the correct verb: "Neither the coach nor the players ___ happy about the rain delay."', 'were', ['was', 'is', 'has been'], 'With "neither…nor," the verb agrees with the CLOSER subject: "players" (plural) → "were."', 'Look at the subject closest to the verb.'),
  S('L.9.1', 'Choose the correct verb: "The team ___ on the bus right now."', 'is', ['are', 'were', 'be'], '"Team" is a collective noun acting as one group, so it takes a singular verb.', 'Is the team acting as one unit here?'),
  S('L.9.1', 'Choose the correct verb: "There ___ three reasons for the new rule."', 'are', ['is', 'was', 'has been'], 'In "There is/are" sentences the subject comes AFTER the verb. "Reasons" is plural → "are."', 'Flip it: "Three reasons ___ there."'),
  S('L.9.1', 'Which sentence uses pronouns correctly?', 'Jamal and I studied for the Algebra test together.', ['Jamal and me studied for the Algebra test together.', 'Me and Jamal studied for the Algebra test together.', 'Him and Jamal studied for the Algebra test together.'], 'Take out "Jamal and": "I studied" (not "me studied"). Subjects use I, he, she, we, they.', 'Remove the other person and read it again.'),
  S('L.9.1', 'Which sentence uses pronouns correctly?', 'Coach gave the awards to Tasha and me.', ['Coach gave the awards to Tasha and I.', 'Coach gave the awards to Tasha and myself.', 'Coach gave the awards to her and I.'], 'After a preposition ("to"), use object pronouns: me, him, her, us, them. "Gave the awards to me."', 'Remove "Tasha and" and read it again.'),
  S('L.9.1', 'Which sentence uses pronouns CLEARLY (no confusion about who "he" is)?', 'When Marcus met Jaylen at the gym, Marcus showed him a new move.', ['When Marcus met Jaylen at the gym, he showed him a new move.', 'When he met him at the gym, Marcus showed Jaylen his move.', 'He showed him a new move when they met at the gym.'], 'A pronoun needs a clear antecedent. In the other choices, "he" could mean Marcus OR Jaylen.', 'In each sentence, ask: who does "he" refer to? Can you tell for sure?'),
  S('L.9.1', 'Choose the correct word: "___ going to the game after school?"', 'Who\'s', ['Whose', 'Whos', 'Who\'se'], '"Who\'s" = "who is." "Whose" shows ownership.', 'Can you say "who is" instead?'),
  S('L.9.1', 'Choose the correct sentence.', 'They\'re bringing their speakers over there.', ['Their bringing there speakers over they\'re.', 'There bringing their speakers over they\'re.', 'They\'re bringing there speakers over their.'], 'They\'re = they are. Their = belongs to them. There = a place.', 'Test each one: "they are," "belongs to them," or "a place."'),
  S('L.9.1', 'Choose the correct sentence.', 'The dog wagged its tail when it\'s owner came home.', ['The dog wagged it\'s tail when its owner came home.', 'The dog wagged its tail when its owner came home.', 'The dog wagged it\'s tail when it\'s owner came home.'], 'Wait — read carefully. Only "its" (no apostrophe) shows ownership. "It\'s" means "it is." The only fully correct sentence is: "The dog wagged its tail when its owner came home."', 'Replace each with "it is" — does it make sense?'),
  S('L.9.1', 'Which word correctly completes the sentence? "The storm had a big ___ on the town."', 'effect', ['affect', 'affects', 'effecting'], '"Effect" is usually a noun (a result). "Affect" is usually a verb (to influence). After "a big," you need a noun.', 'Is a noun or a verb needed here?'),
  S('L.9.1', 'Which word correctly completes the sentence? "I would rather walk ___ wait for the bus."', 'than', ['then', 'that', 'thin'], '"Than" compares. "Then" refers to time.', 'Is this a comparison or a time order?'),
  S('L.9.1', 'Which sentence uses the correct verb tense?', 'Yesterday, Ezekiel finished his project and turned it in.', ['Yesterday, Ezekiel finishes his project and turned it in.', 'Yesterday, Ezekiel finished his project and turns it in.', 'Yesterday, Ezekiel will finish his project and turned it in.'], '"Yesterday" signals past tense. Both verbs must be past: finished, turned.', 'What word tells you WHEN this happened?'),
  S('L.9.1', 'Which sentence is written correctly?', 'She should have called before coming over.', ['She should of called before coming over.', 'She should have call before coming over.', 'She should of call before coming over.'], '"Should have" is correct. "Should of" is a common mistake because they sound alike when spoken.', 'Say "should\'ve" slowly — what two words make it?'),
  S('L.9.1', 'Choose the correct word: "I did ___ on the test."', 'well', ['good', 'gooder', 'more good'], '"Well" is an adverb that describes HOW you did. "Good" is an adjective.', 'You need a word describing the verb "did."'),
  // L.9.1a parallel structure
  S('L.9.1a', 'Which sentence has correct parallel structure?', 'Over the summer, Marcus liked fishing, swimming, and hiking.', ['Over the summer, Marcus liked fishing, to swim, and hiking.', 'Over the summer, Marcus liked to fish, swimming, and hikes.', 'Over the summer, Marcus liked fishing, swim, and to hike.'], 'Items in a list must match in form. "Fishing, swimming, hiking" are all -ing words.', 'Do all the items in the list look alike?'),
  S('L.9.1a', 'Which sentence has correct parallel structure?', 'The coach told us to stretch, to hydrate, and to rest.', ['The coach told us to stretch, hydrating, and rest.', 'The coach told us stretching, to hydrate, and resting.', 'The coach told us to stretch, hydrate, and resting.'], 'All three items use "to + verb."', 'Check the form of each list item.'),
  S('L.9.1a', 'Which revision fixes the faulty parallelism? "The job requires speed, accuracy, and being patient."', 'The job requires speed, accuracy, and patience.', ['The job requires being fast, accuracy, and patience.', 'The job requires speed, being accurate, and patience.', 'The job requires speed, accuracy, and to be patient.'], 'All three items should be nouns: speed, accuracy, patience.', 'The first two items are nouns. Make the third one match.'),
  S('L.9.1a', 'Which sentence has correct parallel structure?', 'Tasha is not only smart but also kind.', ['Tasha is not only smart but also has kindness.', 'Tasha not only is smart but also kindness.', 'Tasha is not only smart but also she is kind.'], 'After "not only" and "but also," use the same type of word: two adjectives (smart, kind).', 'What type of word follows "not only"? Match it after "but also."'),
  S('L.9.1a', 'Which sentence has correct parallel structure?', 'I would rather read a book than watch a movie.', ['I would rather read a book than watching a movie.', 'I would rather reading a book than watch a movie.', 'I would rather to read a book than watching a movie.'], 'Compared actions should have the same form: read / watch.', 'Make both actions look the same.'),
  S('L.9.1a', 'Which sentence has correct parallel structure?', 'The speech was clear, moving, and memorable.', ['The speech was clear, moving, and people remembered it.', 'The speech was clear, it moved people, and memorable.', 'The speech was clarity, moving, and memorable.'], 'Three adjectives in a row: clear, moving, memorable.', 'Are all three items the same part of speech?'),
  // L.9.1b phrases & clauses
  S('L.9.1b', 'In "<i>After the game ended, the fans rushed onto the field</i>," the part "<u>After the game ended</u>" is a(n) —', 'dependent clause', ['independent clause', 'prepositional phrase', 'complete sentence'], 'It has a subject (game) and a verb (ended) but begins with "After," so it cannot stand alone.', 'Does it have a subject and verb? Can it stand alone?'),
  S('L.9.1b', 'Which group of words is an <b>independent clause</b>?', 'the bus arrived late', ['because the bus arrived late', 'after the late bus', 'arriving late on the bus'], 'It has a subject (bus), a verb (arrived), and a complete thought.', 'Which one could be a sentence by itself?'),
  S('L.9.1b', 'In "<i>The girl <u>with the purple backpack</u> is my cousin</i>," the underlined words are a —', 'prepositional phrase', ['dependent clause', 'independent clause', 'verb phrase'], 'It starts with a preposition ("with") and has no verb.', 'Is there a verb in the underlined part?'),
  S('L.9.1b', 'In "<i><u>Running late</u>, Jaylen grabbed a granola bar</i>," the underlined words are a —', 'participial phrase', ['independent clause', 'prepositional phrase', 'dependent clause'], 'A participial phrase starts with an -ing (or -ed) verb form and acts like an adjective, describing Jaylen.', 'Does it begin with an -ing word that describes someone?'),
  S('L.9.1b', 'Which sentence contains a dependent clause?', 'I will call you when I get home.', ['I will call you tonight.', 'I will call you from my house.', 'Call me tonight.'], '"When I get home" has a subject and verb but starts with "when," so it is dependent.', 'Look for words like when, because, if, although, since.'),
  S('L.9.1b', 'In "<i>The book <u>that I borrowed</u> is overdue</i>," the underlined part is a(n) —', 'adjective (relative) clause', ['adverb clause', 'prepositional phrase', 'independent clause'], 'It has a subject and verb and describes the noun "book," so it is an adjective (relative) clause.', 'What word does the underlined part describe?'),
  S('L.9.1b', 'Which word could turn "<i>we left early</i>" into a dependent clause?', 'because', ['and', 'but', 'so'], 'Subordinating conjunctions (because, when, although, if) make a clause dependent. "and, but, so" are coordinating conjunctions.', 'Which word makes the clause sound unfinished?'),
  S('L.9.1b', 'In "<i>To win the championship</i> was the team\'s goal," the italic words are a(n) —', 'infinitive phrase', ['dependent clause', 'prepositional phrase', 'independent clause'], 'An infinitive phrase starts with "to + verb" ("to win").', 'Look at the first two words.'),
  // L.9.2 punctuation
  S('L.9.2', 'Which sentence uses a semicolon correctly?', 'The storm knocked out the power; we finished our homework by flashlight.', ['The storm knocked out the power; and we finished our homework.', 'The storm; knocked out the power, so we used flashlights.', 'Because the storm knocked out the power; we used flashlights.'], 'A semicolon joins two COMPLETE sentences without a conjunction.', 'Can BOTH sides of the semicolon stand alone?'),
  S('L.9.2', 'Which sentence uses a colon correctly?', 'Coach gave us three rules: show up early, work hard, and support your teammates.', ['Coach gave us: three rules for the season.', 'Coach said that: we should show up early.', 'The rules were: early, hard work, and support.'], 'A colon must follow a COMPLETE sentence. It then introduces a list or explanation.', 'Is the part BEFORE the colon a complete sentence?'),
  S('L.9.2', 'Which sentence is punctuated correctly?', 'Before the bell rang, Tasha finished her essay.', ['Before the bell rang Tasha, finished her essay.', 'Before, the bell rang Tasha finished her essay.', 'Before the bell, rang Tasha finished her essay.'], 'Put a comma after an introductory dependent clause.', 'Where does the introduction end?'),
  S('L.9.2', 'Which sentence uses commas correctly?', 'We packed sandwiches, chips, apples, and water.', ['We packed, sandwiches, chips, apples, and water.', 'We packed sandwiches chips, apples and, water.', 'We packed sandwiches, chips apples, and water.'], 'Use commas to separate items in a series.', 'Put a comma after each item except the last.'),
  S('L.9.2', 'Which sentence uses a comma correctly with a conjunction?', 'I wanted to go to the game, but I had to work.', ['I wanted to go to the game but, I had to work.', 'I wanted, to go to the game but I had to work.', 'I wanted to go to the game but I, had to work.'], 'When FANBOYS (for, and, nor, but, or, yet, so) join two complete sentences, put the comma BEFORE the conjunction.', 'The comma goes right before "but."'),
  S('L.9.2', 'Which sentence correctly sets off the nonessential information?', 'My cousin, who lives in Olive Branch, plays the trumpet.', ['My cousin who lives in Olive Branch, plays the trumpet.', 'My cousin, who lives in Olive Branch plays the trumpet.', 'My, cousin who lives in Olive Branch plays the trumpet.'], 'Extra (nonessential) information needs commas on BOTH sides.', 'Could you remove the extra part and still have a complete sentence?'),
  S('L.9.2', 'Which sentence uses a semicolon correctly with a transition?', 'The test was difficult; however, most students passed.', ['The test was difficult, however; most students passed.', 'The test was difficult; however most students passed.', 'The test was difficult however, most students passed.'], 'Use a semicolon BEFORE and a comma AFTER a transition like "however" that joins two sentences.', 'Pattern: sentence; however, sentence.'),
  S('L.9.2', 'Which is the correct way to fix this comma splice? "<i>The game was canceled, it was raining too hard.</i>"', 'The game was canceled; it was raining too hard.', ['The game was canceled, it, was raining too hard.', 'The game was canceled it was raining too hard.', 'The game, was canceled it was raining too hard.'], 'A semicolon can join two complete sentences. (A period or ", because" would also work.)', 'Two complete thoughts need more than a comma.'),
  S('L.9.2', 'Which sentence uses an apostrophe correctly?', 'The players\' uniforms were washed after the game.', ['The player\'s uniforms were washed after all the players games.', 'The players uniform\'s were washed after the game.', 'The players\'s uniforms were washed after the game.'], 'For a plural noun ending in -s ("players"), add only an apostrophe to show ownership: players\'.', 'Is "players" singular or plural? Who owns the uniforms?'),
  S('L.9.2', 'Which sentence punctuates the quotation correctly?', 'Ms. Davis said, "Turn in your essays on Friday."', ['Ms. Davis said "Turn in your essays on Friday".', 'Ms. Davis said, "turn in your essays on Friday".', 'Ms. Davis said, Turn in your essays on Friday."'], 'Use a comma before the quote, capitalize the first word, and put the period INSIDE the closing quotation mark.', 'Check the comma, the capital letter, and where the period goes.'),
  S('L.9.2', 'Which sentence uses a colon correctly?', 'There is only one thing left to do: study.', ['The ingredients are: flour, sugar, and eggs.', 'My favorite subjects are: math and science.', 'We need: pencils and paper.'], 'Only the first sentence has a complete thought before the colon. Never put a colon right after a verb like "are" or "need."', 'Cover the part after the colon. Is what is left a complete sentence?'),
  S('L.9.2', 'Which word is spelled correctly?', 'necessary', ['neccessary', 'necesary', 'neccesary'], 'Necessary: one "c," two "s"s. Memory trick: one Collar, two Sleeves.', 'Think: one collar, two sleeves.'),
  S('L.9.2', 'Which word is spelled correctly?', 'definitely', ['definately', 'defiantly', 'definitly'], 'Definitely contains the word "finite." ("Defiantly" is a different word meaning rebelliously.)', 'Look for the word "finite" inside it.'),
  // W.9.1 argument
  S('W.9.1', 'Which sentence would be the strongest CLAIM for an argument essay?', 'Mississippi high schools should start no earlier than 8:30 a.m. because teenagers need more sleep to learn well.', ['Some schools start early and some start late.', 'I think school is sometimes too early, maybe.', 'Sleep is something that everyone does every night.'], 'A strong claim takes a clear, arguable position and previews the reason.', 'Which one takes a side someone could disagree with?'),
  S('W.9.1', 'A student argues that phones should be allowed at lunch. Which evidence BEST supports the claim?', 'A district survey found 78% of parents want to reach their child during the school day.', ['My friend says phones are really fun.', 'Phones were invented many years ago.', 'Some students have phones that are blue.'], 'Strong evidence is specific, credible, and directly connected to the claim.', 'Which one is specific and connected to the reason phones are needed?'),
  S('W.9.1', 'What is a COUNTERCLAIM?', 'An opposing argument that the writer acknowledges and then answers', ['A second claim that agrees with the first', 'The final sentence of a conclusion', 'A quote from an expert that supports the thesis'], 'Addressing a counterclaim shows you understand the other side and makes your argument stronger.', '"Counter" means against.'),
  S('W.9.1', 'Which sentence is the best REBUTTAL to this counterclaim: "Later start times would make after-school practices end too late"?', 'While practices might shift later, schools such as those in Seattle adjusted schedules and saw attendance improve.', ['Practices are not important anyway.', 'That is a bad argument and people who believe it are wrong.', 'Some students do not play sports.'], 'A good rebuttal admits the concern and answers it with reasoning or evidence — without insulting anyone.', 'Which one responds respectfully with evidence?'),
  S('W.9.1', 'Which is an example of REASONING (explaining how evidence supports a claim)?', 'This shows that when students sleep more, they are able to focus and remember information better.', ['According to the CDC, most teens get less than 8 hours of sleep.', 'Schools should start later.', 'Some people disagree with later start times.'], 'Reasoning explains WHY the evidence matters. It often starts with "This shows…" or "This means…"', 'Which sentence explains instead of just stating a fact?'),
  S('W.9.1', 'Which source would be the MOST convincing evidence in an argument about school lunch nutrition?', 'Data from the U.S. Department of Agriculture on calories in school meals', ['A comment on a cooking video', 'A student\'s favorite lunch menu', 'An ad for a fast-food restaurant'], 'Government data is credible, factual, and directly related to the topic.', 'Which source is an expert and unbiased?'),
  S('W.9.1', 'Which phrase shows a writer is using an emotional appeal (pathos)?', 'Imagine a child sitting alone in a dark house, hungry and afraid.', ['Studies show 1 in 6 children face hunger.', 'As a doctor with 20 years of experience, I can say…', 'First, consider the cost of the program.'], 'Pathos appeals to the reader\'s feelings, often with vivid images.', 'Which one tries to make you FEEL something?'),
  S('W.9.1', 'Which phrase is an appeal to credibility (ethos)?', 'As a nurse who has worked in schools for 15 years, I have seen this problem firsthand.', ['Picture your own little brother going hungry.', 'Statistics show a 20% increase.', 'Everyone knows this is true.'], 'Ethos builds trust in the speaker\'s experience or character.', 'Which one makes you trust the SPEAKER?'),
  S('W.9.1', 'Which phrase is an appeal to logic (logos)?', 'Schools that started later saw graduation rates rise by 8 percent.', ['This issue breaks my heart.', 'Trust me, I know what I am talking about.', 'Only a fool would disagree.'], 'Logos uses facts, numbers, and reasoning.', 'Which one uses data?'),
  S('W.9.1', 'What is the main problem with this argument? "Everyone at my school wants longer lunch, so it must be a good idea."', 'It assumes something is right just because many people want it.', ['It uses too many statistics.', 'It addresses a counterclaim.', 'It cites a credible source.'], 'This is the "bandwagon" fallacy: popularity does not prove a claim is correct.', 'Does popularity prove something is a good idea?'),
  S('W.9.1', 'Where does the thesis (claim) usually appear in an argument essay?', 'At the end of the introduction', ['In the middle of the second body paragraph', 'Only in the conclusion', 'In the title only'], 'The thesis usually ends the introduction so the reader knows the writer\'s position before the body paragraphs.', 'Readers need to know your position early.'),
  // W.9.2 informative / L.9.3 style
  S('L.9.3', 'Which sentence is most appropriate for a FORMAL essay?', 'The Civil Rights Movement led to major changes in federal voting law.', ['The Civil Rights Movement was super huge and changed a ton of stuff.', 'Honestly, you guys, the Civil Rights Movement was a big deal.', 'So basically the Civil Rights Movement changed laws and stuff.'], 'Formal style avoids slang, filler words, and talking directly to "you guys."', 'Which one sounds like a textbook?'),
  S('L.9.3', 'Which revision makes the sentence more CONCISE? "<i>Due to the fact that it was raining, the game was postponed until a later time.</i>"', 'Because it was raining, the game was postponed.', ['Due to the fact that it was raining outside, the game was postponed until a later time in the future.', 'The game was postponed until later due to the fact of rain.', 'It was raining, which was the reason due to which the game was postponed later.'], '"Due to the fact that" = "because," and "until a later time" adds nothing. Concise writing cuts extra words.', 'Which version says the same thing in the fewest words?'),
  S('L.9.3', 'Which sentence keeps a consistent, formal tone for a research report?', 'The data indicate that attendance improved after the change.', ['The data totally show attendance got way better.', 'Attendance improved, which is awesome!!', 'LOL, attendance went up after that.'], 'Formal tone: no slang, no exclamation overload, no texting abbreviations.', 'Which one could appear in a textbook?'),
  S('L.9.3', 'Which revision avoids repeating words? "<i>The team won the game. The team celebrated after the game.</i>"', 'The team won the game and celebrated afterward.', ['The team won the game and the team celebrated after the game.', 'The team, the team won the game and celebrated.', 'Won the game, the team celebrated the game.'], 'Combining sentences and using "afterward" removes repetition.', 'How can you say "the team" and "the game" only once?'),
  S('L.9.3', 'Which word choice gives the sentence a more precise meaning? "The coach was ___ when the referee made the bad call."', 'furious', ['mad', 'upset', 'not happy'], '"Furious" is specific and strong. The others are vague.', 'Which word paints the clearest picture?'),
  S('W.9.2', 'What is the main purpose of an informative essay?', 'To explain a topic clearly using facts', ['To persuade readers to take a side', 'To tell a made-up story', 'To share personal feelings only'], 'Informative (expository) writing explains or informs. It does not argue.', 'Inform = explain.'),
  S('W.9.2', 'Which is the best topic sentence for a paragraph about how hurricanes form?', 'Hurricanes form when warm ocean water, moist air, and low pressure combine.', ['Hurricanes are really scary.', 'My family evacuated during a hurricane once.', 'There are many kinds of weather.'], 'A good topic sentence states the paragraph\'s main point clearly and specifically.', 'Which one tells exactly what the paragraph will explain?'),
  S('W.9.2', 'Which detail would BEST support the topic sentence "The Mississippi River is important to the U.S. economy"?', 'Barges on the river carry about 60 percent of the nation\'s grain exports.', ['The river is very wide in some places.', 'Mark Twain wrote about the river.', 'The river looks brown.'], 'The detail must connect directly to the ECONOMY.', 'Which detail is about money or business?'),
  S('W.9.2', 'What should a strong conclusion to an informative essay do?', 'Sum up the main points and explain why the topic matters', ['Introduce a brand-new topic', 'Repeat the introduction word for word', 'End with "That is all I have to say."'], 'A conclusion wraps up the key ideas and leaves the reader with their importance.', 'Think: "So what?"'),
  // W.9.8 research
  S('W.9.8', 'Which source would be MOST credible for a report on Mississippi River flooding?', 'A report from the U.S. Army Corps of Engineers', ['An anonymous social media post', 'A fiction novel set on the river', 'A blog selling river cruise tickets'], 'Credible sources come from experts, are factual, and have no reason to mislead.', 'Who are the experts?'),
  S('W.9.8', 'Why do writers cite their sources?', 'To give credit for others\' ideas and let readers check the information', ['To make the essay longer', 'Because teachers like long lists', 'To hide where the information came from'], 'Citing gives credit (avoiding plagiarism) and builds the writer\'s credibility.', 'Whose ideas are they?'),
  S('W.9.8', 'Which website ending usually belongs to a government agency?', '.gov', ['.com', '.net', '.biz'], '.gov sites are run by government agencies. .edu is for schools. .com is usually commercial.', 'Which one sounds like "government"?'),
  S('W.9.8', 'Which is an example of PLAGIARISM?', 'Copying a paragraph from a website into your essay without quotation marks or a citation', ['Quoting a sentence and citing the author', 'Summarizing an article in your own words and citing it', 'Using your own ideas and experiences'], 'Plagiarism is using someone else\'s words or ideas as if they were your own.', 'Which one takes credit for someone else\'s work?'),
  S('W.9.8', 'What is the BEST way to check whether a surprising fact you found online is true?', 'Look for the same fact in two or more reliable sources', ['Share it with friends to see if they believe it', 'Check how many likes the post has', 'Assume it is true if it has a photo'], 'Verifying with multiple credible sources is how researchers confirm facts.', 'How could you confirm it?'),
  S('W.9.8', 'You are researching how sleep affects teen learning. Which search terms would work BEST?', 'teen sleep effects on learning research', ['sleep', 'why am I tired lol', 'school'], 'Specific key words return more useful, focused results.', 'Which search is the most specific?'),
  S('W.9.8', 'What does it mean to PARAPHRASE?', 'To restate someone else\'s idea in your own words (and still cite it)', ['To copy someone\'s exact words', 'To make up your own fact', 'To list your sources at the end'], 'A paraphrase uses your own words and sentence structure — but the idea still came from a source, so you cite it.', 'Para = alongside; phrase = words.'),
  S('W.9.8', 'Which question would be best for a research paper? (Not too broad, not too narrow.)', 'How did the Great Migration change music in Chicago?', ['What is music?', 'What year was one song released?', 'Do people like music?'], 'A good research question is focused but big enough to explore with several sources.', 'Which one could you research for a few pages?'),
  S('W.9.8', 'Which is the correct way to show a direct quotation from a source in your essay?', 'According to the CDC, "Most teens need 8 to 10 hours of sleep" (CDC).', ['According to the CDC, most teens need 8 to 10 hours of sleep and that is a fact.', 'Most teens need 8 to 10 hours of sleep (I read it somewhere).', '"According to the CDC most teens" need sleep.'], 'Exact words go inside quotation marks, and the source is named and cited.', 'Exact words need quotation marks AND a source.'),
  S('W.9.8', 'Which detail makes a website LESS trustworthy?', 'It has no author, no date, and is selling a product.', ['It is run by a university.', 'It lists its sources at the bottom.', 'It was updated this year.'], 'Missing author/date and a sales motive are warning signs.', 'Think CRAAP: authority, currency, purpose.'),
  // W.9.3 narrative & W.9.5 revision
  S('W.9.3', 'Which sentence would make the most engaging opening (hook) for a narrative?', 'The scoreboard read 54–53 with three seconds left, and the ball was in my hands.', ['This story is about a basketball game.', 'Once upon a time there was a game.', 'I am going to tell you what happened.'], 'A strong hook drops the reader into action or tension right away.', 'Which one makes you want to keep reading?'),
  S('W.9.3', 'Which sentence uses the most vivid SENSORY detail?', 'The gym smelled like popcorn and sweat, and the bleachers shook with every stomp.', ['The gym was nice.', 'There were people in the gym.', 'It was a game.'], 'Sensory details appeal to sight, sound, smell, taste, or touch.', 'Which one lets you smell and feel the scene?'),
  S('W.9.3', 'What is DIALOGUE used for in a narrative?', 'To show characters\' personalities and move the story forward', ['To list facts and statistics', 'To state the thesis', 'To cite sources'], 'Dialogue lets characters speak, revealing who they are and advancing the plot.', 'Why do writers let characters talk?'),
  S('W.9.3', '"Show, don\'t tell." Which sentence SHOWS that Ezekiel is nervous?', 'Ezekiel\'s hands shook as he tapped his pencil against the desk again and again.', ['Ezekiel was nervous.', 'Ezekiel felt very nervous about the test.', 'Ezekiel is a nervous person.'], 'Showing uses actions and details so the reader figures out the feeling.', 'Which one never uses the word "nervous" but makes you feel it?'),
  S('W.9.5', 'Which revision best combines the two sentences? "<i>The Jaguars won. They won by twenty points.</i>"', 'The Jaguars won by twenty points.', ['The Jaguars won, they won by twenty points.', 'The Jaguars won and they won by twenty points and it was great.', 'The Jaguars, who won, won by twenty points.'], 'Combining removes repetition and makes writing smoother.', 'How could you say it once?'),
  S('W.9.5', 'Which sentence should be REMOVED from a paragraph about the benefits of exercise?', 'My favorite color is purple.', ['Exercise strengthens the heart.', 'Regular activity can improve sleep.', 'Exercise can reduce stress.'], 'A sentence that does not support the main idea should be cut.', 'Which sentence is off-topic?'),
  S('W.9.5', 'Which is the best order for these sentences? (1) Then mix in the eggs. (2) First, preheat the oven. (3) Finally, bake for 20 minutes. (4) Next, combine flour and sugar.', '2, 4, 1, 3', ['1, 2, 3, 4', '4, 2, 1, 3', '2, 1, 4, 3'], 'Follow the transition words: First → Next → Then → Finally.', 'Look at the transition word at the start of each sentence.'),
  S('W.9.3', 'Which ending would be the most meaningful for a story about losing a big game?', 'Walking off the court, I realized I had played my hardest — and that next season had already started.', ['Then the game ended. The end.', 'We lost and I went home and ate dinner.', 'Basketball is a sport played with a ball.'], 'A strong ending shows reflection or change, not just "the end."', 'Which ending shows what the character learned?'),
  S('W.9.5', 'Which revision replaces the weak verb with a stronger one? "<i>The runner went across the finish line.</i>"', 'The runner sprinted across the finish line.', ['The runner went really fast across the finish line.', 'The runner was going across the finish line.', 'The runner did go across the finish line.'], 'Precise verbs (sprinted) show action better than general verbs plus adverbs.', 'Swap "went" for one exact action word.'),
  S('W.9.5', 'What is the difference between REVISING and EDITING?', 'Revising improves ideas and organization; editing fixes grammar, spelling, and punctuation.', ['They mean exactly the same thing.', 'Revising fixes spelling; editing changes ideas.', 'Editing happens before you write.'], 'Revise = re-see the big picture. Edit = fix the small errors.', 'Re-VISE = see again.'),
  // L.9.5 connotation & nuance
  S('L.9.5', 'Which word has the most NEGATIVE connotation?', 'stubborn', ['determined', 'persistent', 'dedicated'], 'All four mean not giving up, but "stubborn" suggests being unreasonable.', 'Which word would you NOT want someone to call you?'),
  S('L.9.5', 'Which word has the most POSITIVE connotation?', 'slender', ['skinny', 'bony', 'scrawny'], 'They all mean thin, but "slender" sounds graceful; the others sound unflattering.', 'Which one sounds like a compliment?'),
  S('L.9.5', 'Which word has the most POSITIVE connotation?', 'confident', ['arrogant', 'cocky', 'conceited'], 'All describe self-belief, but only "confident" is positive.', 'Which one is a compliment?'),
  S('L.9.5', 'What does the idiom "hit the books" mean?', 'to study hard', ['to throw books', 'to buy new books', 'to be angry at school'], 'An idiom\'s meaning is different from its literal words.', 'What do students do before a big test?'),
  S('L.9.5', '"<i>The news was a punch in the stomach.</i>" What does this metaphor suggest?', 'The news was shocking and painful.', ['Someone was actually punched.', 'The news was about boxing.', 'The news was funny.'], 'The comparison suggests the news hurt suddenly, the way a punch would.', 'How does a punch in the stomach FEEL?')
];

/* "Its/it's" item above is intentionally tricky; replace with a clean version so the key is unambiguous. */
ENG_STATIC[10] = S('L.9.1', 'Choose the correctly written sentence.', 'The dog wagged its tail when its owner came home.', ['The dog wagged it\'s tail when its owner came home.', 'The dog wagged its tail when it\'s owner came home.', 'The dog wagged it\'s tail when it\'s owner came home.'], '"Its" (no apostrophe) shows ownership. "It\'s" always means "it is" or "it has."', 'Replace each with "it is" — does it make sense?');

HUB.eng = GEN.concat(ENG_STATIC);
HUB.engCount = GEN.reduce((a, g) => a + g.count, 0) + ENG_STATIC.length;
