/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   ENGLISH I & READING LESSONS — one core lesson per subject per week.
   English lessons may include `write`: a short writing task with a
   self-check checklist ([label, regex]).
   Reading lessons use a `passage` and a `model` (teacher think-aloud).
   ===================================================================== */
HUB.lessons = HUB.lessons || [];
HUB.lessons.push(
/* ============================ ENGLISH I ============================ */
{ id: 'e1', subj: 'eng', week: 1, unit: 0, title: 'Parts of Speech: The Building Blocks', stds: ['L.7.1'], only: ['pos'],
  objective: 'I can identify nouns, verbs, adjectives, adverbs, pronouns, prepositions, and conjunctions by the JOB they do in a sentence.',
  vocab: [['noun', 'person, place, thing, or idea'], ['verb', 'action or state of being'], ['adjective', 'describes a noun'], ['adverb', 'describes a verb, adjective, or adverb (how, when, where, how much)'], ['preposition', 'shows a relationship (in, on, under, after, between)'], ['conjunction', 'joins words or ideas (and, but, or, because)']],
  learn: `<p>Every grammar rule you'll learn this semester depends on knowing what each word is DOING. A word's part of speech depends on its job in that sentence.</p>
  <p>Example: "I <b>run</b> every morning" (verb) vs. "I went for a <b>run</b>" (noun).</p>
  <p><b>Quick tests:</b> Can you put "the" in front of it? → probably a noun. Can you put "I" or "they" in front of it? → probably a verb. Does it answer "how?" → probably an adverb.</p>`,
  examples: [{ title: 'Label a sentence', steps: [['Sentence', 'The nervous freshman quickly opened his locker.'], ['Nouns', 'freshman, locker'], ['Verb', 'opened'], ['Adjective', 'nervous (describes freshman)'], ['Adverb', 'quickly (HOW he opened)'], ['Pronoun', 'his']] }],
  checks: [['In "She sang beautifully," what is "beautifully"?', 'adverb', ['adjective', 'verb', 'noun'], 'It tells HOW she sang.'], ['In "The keys are on the table," what is "on"?', 'preposition', ['verb', 'adverb', 'noun'], 'It shows where the keys are.'], ['Which word is a conjunction?', 'but', ['quickly', 'under', 'happy'], 'Conjunctions join ideas.']],
  showMe: 'Write one sentence about your day and label at least four different parts of speech in it.' },

{ id: 'e2', subj: 'eng', week: 2, unit: 0, title: 'Complete Sentences, Fragments & Run-ons', stds: ['L.7.1'], only: ['sent-type', 'sent-struct'],
  objective: 'I can tell the difference between complete sentences, fragments, run-ons, and comma splices — and fix them.',
  vocab: [['complete sentence', 'subject + verb + complete thought'], ['fragment', 'missing a subject, verb, or complete thought'], ['run-on', 'two sentences jammed together with no punctuation'], ['comma splice', 'two sentences joined with only a comma'], ['FANBOYS', 'for, and, nor, but, or, yet, so']],
  learn: `<p>Fragments and run-ons are the #1 reason writing loses points. Here's how to fix them:</p>
  <ul><li><b>Fragment</b> → attach it to a nearby sentence or add what's missing. "Because I was late." → "Because I was late, I missed the bus."</li>
  <li><b>Run-on / comma splice</b> → fix it 4 ways: (1) period, (2) comma + FANBOYS, (3) semicolon, (4) make one part dependent with "because, when, although."</li></ul>`,
  examples: [{ title: 'Fix a comma splice four ways', steps: [['Comma splice', 'It rained, the game was canceled.'], ['1. Period', 'It rained. The game was canceled.'], ['2. Comma + FANBOYS', 'It rained, so the game was canceled.'], ['3. Semicolon', 'It rained; the game was canceled.'], ['4. Dependent clause', 'Because it rained, the game was canceled.']] }],
  checks: [['"Walking home after practice." This is a —', 'fragment', ['complete sentence', 'run-on', 'comma splice'], 'No subject and no complete thought.'], ['Which fixes "I studied I passed"?', 'I studied, and I passed.', ['I studied, I passed.', 'I studied and, I passed.', 'I studied I, passed.'], 'Comma + FANBOYS joins two sentences.'], ['Which word makes a clause dependent?', 'although', ['and', 'but', 'so'], 'Subordinating words make a clause unable to stand alone.']],
  write: { prompt: 'Write two sentences about a game or event you went to. Use one semicolon correctly and one "because" clause.', checklist: [['Uses a semicolon', ';'], ['Uses "because"', '\\bbecause\\b'], ['At least two sentences', '[.!?][\\s\\S]*[.!?]']] },
  showMe: 'Explain the difference between a run-on and a comma splice in your own words.' },

{ id: 'e3', subj: 'eng', week: 3, unit: 0, title: 'Usage: Agreement, Pronouns & Confused Words', stds: ['L.9.1'],
  objective: 'I can make subjects and verbs agree, use pronouns correctly, and choose between commonly confused words.',
  vocab: [['subject–verb agreement', 'singular subject → singular verb; plural → plural'], ['antecedent', 'the noun a pronoun refers to'], ['homophones', 'words that sound alike but differ (their / there / they\'re)']],
  learn: `<ul><li><b>Cross out prepositional phrases</b> to find the real subject: "The box <s>of trophies</s> sits…"</li><li><b>Each, every, everyone, neither, either</b> are singular.</li><li><b>Pronoun case:</b> remove the other person: "Jamal and I went" (I went). "Give it to Tasha and me" (to me).</li><li><b>Confused words:</b> their (owns) / there (place) / they're (they are); its (owns) / it's (it is); than (compare) / then (time); affect (verb) / effect (noun).</li></ul>`,
  examples: [{ title: 'Agreement', steps: [['The list of supplies (is / are) on the board.', 'Cross out "of supplies"'], ['Real subject: list (singular)', 'Use "is"'], ['Answer', 'The list of supplies is on the board.']] }],
  checks: [['Everyone ___ ready.', 'is', ['are', 'were', 'be'], '"Everyone" is singular.'], ['Choose: "___ going to be late."', 'They\'re', ['Their', 'There', 'Theyre'], 'They are going to be late.'], ['Choose: "Mom drove Kayla and ___."', 'me', ['I', 'myself', 'mine'], '"Mom drove me."']],
  showMe: 'Write a sentence that uses their, there, and they\'re correctly.' },

{ id: 'e4', subj: 'eng', week: 4, unit: 1, title: 'Phrases & Clauses', stds: ['L.9.1b'],
  objective: 'I can identify phrases (prepositional, participial, infinitive) and clauses (independent, dependent) and use them to add variety.',
  vocab: [['clause', 'a group of words with a subject AND a verb'], ['independent clause', 'can stand alone as a sentence'], ['dependent clause', 'has subject + verb but cannot stand alone'], ['phrase', 'a group of words WITHOUT both a subject and a verb']],
  learn: `<p>Phrases and clauses let you build richer sentences.</p>
  <ul><li><b>Prepositional phrase:</b> starts with a preposition — "under the bleachers."</li><li><b>Participial phrase:</b> -ing/-ed verb acting like an adjective — "<u>Exhausted from practice</u>, Ezekiel fell asleep."</li><li><b>Infinitive phrase:</b> to + verb — "<u>To pass Algebra</u> is my goal."</li><li><b>Dependent clause:</b> subordinate word + subject + verb — "<u>when the bell rang</u>."</li></ul>`,
  examples: [{ title: 'Build up a sentence', steps: [['Simple', 'Ezekiel studied.'], ['Add a prepositional phrase', 'Ezekiel studied in the library.'], ['Add a dependent clause', 'Because the test was Friday, Ezekiel studied in the library.'], ['Add a participial phrase', 'Because the test was Friday, Ezekiel studied in the library, hoping to raise his grade.']] }],
  checks: [['"Since the bus broke down" is a —', 'dependent clause', ['independent clause', 'prepositional phrase', 'complete sentence'], 'Subject + verb but starts with "since."'], ['"across the street" is a —', 'prepositional phrase', ['clause', 'infinitive phrase', 'sentence'], 'No verb; starts with "across."'], ['Which is an independent clause?', 'the crowd cheered', ['when the crowd cheered', 'cheering crowd', 'for the crowd'], 'It can stand alone.']],
  write: { prompt: 'Write one sentence that begins with a dependent clause and includes a prepositional phrase.', checklist: [['Begins with a subordinating word', '^\\s*(because|when|although|since|if|after|before|while|until|as)\\b'], ['Has a comma after the opening clause', ','], ['Includes a preposition', '\\b(in|on|at|under|over|after|before|with|across|through|between|during|near|from|to)\\b']] },
  showMe: 'Explain how you can tell a phrase from a clause.' },

{ id: 'e5', subj: 'eng', week: 5, unit: 1, title: 'Parallel Structure', stds: ['L.9.1a'],
  objective: 'I can write sentences with parallel structure so that lists and comparisons match in form.',
  vocab: [['parallel structure', 'using the same grammatical form for items that are equal in importance'], ['correlative conjunctions', 'pairs like not only…but also, either…or, both…and']],
  learn: `<p>Parallel structure makes writing smooth and powerful. Famous speeches use it: "government <b>of</b> the people, <b>by</b> the people, <b>for</b> the people."</p>
  <ul><li>Lists: <b>running, jumping, and swimming</b> (not "running, to jump, and swim").</li><li>Pairs: <b>not only</b> smart <b>but also</b> kind.</li><li>Comparisons: I'd rather <b>read</b> than <b>watch</b>.</li></ul>`,
  examples: [{ title: 'Fix it', steps: [['Faulty', 'She likes to dance, singing, and acts.'], ['Choose one form (-ing)', 'dancing, singing, acting'], ['Fixed', 'She likes dancing, singing, and acting.']] }],
  checks: [['Which is parallel?', 'to read, to write, and to think', ['to read, writing, and think', 'reading, to write, and thinking', 'read, writing, to think'], 'All use "to + verb."'], ['Complete: "Coach wants us to be strong, fast, and ___."', 'smart', ['to be smart', 'being smart', 'smartness'], 'Three adjectives.'], ['Which famous line uses parallel structure?', '"of the people, by the people, for the people"', ['"Four score and seven years ago"', '"It is altogether fitting"', '"We are met on a great battle-field"'], 'Repeated structure.']],
  write: { prompt: 'Write a sentence listing three things you want to accomplish this year using parallel structure.', checklist: [['Has a list with commas', ',.*,'], ['Uses "and" before the last item', '\\band\\b']] },
  showMe: 'Why do you think speakers and writers use parallel structure? How does it sound to a listener?' },

{ id: 'e6', subj: 'eng', week: 6, unit: 2, title: 'Comma Rules That Matter Most', stds: ['L.9.2'],
  objective: 'I can use commas correctly in series, after introductory elements, with FANBOYS, and around extra information.',
  vocab: [['series', 'a list of three or more items'], ['introductory element', 'a word, phrase, or clause before the main sentence'], ['nonessential', 'extra information that could be removed']],
  learn: `<p><b>The Big Four comma rules:</b></p><ol><li><b>Series:</b> red, white, and blue.</li><li><b>Introductory element:</b> After the game, we ate.</li><li><b>FANBOYS joining two sentences:</b> I studied, but I was nervous.</li><li><b>Nonessential info (both sides!):</b> My cousin, who lives in Olive Branch, plays trumpet.</li></ol>
  <div class="callout warn">Do NOT put a comma between a subject and its verb: "The boy in the red shirt<s>,</s> scored."</div>`,
  examples: [{ title: 'Apply the rules', steps: [['Unpunctuated', 'However we stayed for the game and our team won by ten points'], ['Introductory word', 'However, we stayed…'], ['Two sentences joined by "and"', '…for the game, and our team won by ten points.']] }],
  checks: [['Which needs a comma after the opening?', 'When the bell rang we left.', ['We left when the bell rang.', 'We left.', 'The bell rang loudly.'], 'Introductory clause → comma.'], ['Where does the comma go? "I was tired but I finished."', 'after "tired"', ['after "but"', 'after "I"', 'no comma'], 'Before the FANBOYS word.'], ['Which is correct?', 'Mr. Lee, our coach, is strict.', ['Mr. Lee, our coach is strict.', 'Mr. Lee our coach, is strict.', 'Mr., Lee our coach is strict.'], 'Commas on both sides of extra info.']],
  showMe: 'Which comma rule do you think you break the most? Write an example and fix it.' },

{ id: 'e7', subj: 'eng', week: 7, unit: 2, title: 'Semicolons, Colons & Apostrophes', stds: ['L.9.2'],
  objective: 'I can use semicolons, colons, apostrophes, and quotation marks correctly.',
  vocab: [['semicolon', 'joins two complete, closely related sentences'], ['colon', 'after a complete sentence, introduces a list or explanation'], ['possessive', 'shows ownership (the team\'s bus)']],
  learn: `<ul><li><b>Semicolon test:</b> could BOTH sides be sentences? If yes, a semicolon works. "I studied; I passed."</li><li><b>With a transition:</b> sentence; however, sentence.</li><li><b>Colon test:</b> is the part BEFORE the colon a complete sentence? "I need three things: pencils, paper, and focus."</li><li><b>Apostrophes:</b> singular → 's (the dog's bone); plural ending in s → s' (the players' bus); contractions (don't, it's).</li><li><b>Quotes:</b> Ms. Davis said, "Turn it in." — period INSIDE.</li></ul>`,
  examples: [{ title: 'Semicolon or colon?', steps: [['"The forecast was clear ___ rain fell anyway."', 'Both sides are complete → semicolon'], ['"Bring one thing ___ a pencil."', 'First part complete, introduces explanation → colon']] }],
  checks: [['Which uses a semicolon correctly?', 'The bus was late; I walked.', ['The bus; was late.', 'Because the bus was late; I walked.', 'The bus was late; and I walked.'], 'Two complete sentences.'], ['Which is correct?', 'the girls\' locker room (many girls)', ['the girl\'s locker room (many girls)', 'the girls locker room\'s', 'the girl\'s\' locker room'], 'Plural ending in s → s\'.'], ['Which uses a colon correctly?', 'My goal is simple: pass Algebra.', ['My goals are: passing and reading.', 'I need: a pen.', 'We went to: the store.'], 'Complete sentence before the colon.']],
  write: { prompt: 'Write one sentence with a semicolon and one sentence with a colon about your goals this semester.', checklist: [['Uses a semicolon', ';'], ['Uses a colon', ':']] },
  showMe: 'Explain the "semicolon test" and the "colon test" in your own words.' },

{ id: 'e8', subj: 'eng', week: 8, unit: 3, title: 'Argument Writing: Claims, Evidence & Reasoning', stds: ['W.9.1'],
  objective: 'I can write a clear claim and support it with credible evidence and reasoning.',
  vocab: [['claim', 'the arguable position you are defending'], ['evidence', 'facts, statistics, examples, or quotes that support the claim'], ['reasoning', 'the explanation of HOW the evidence proves the claim']],
  learn: `<p>An argument is not a fight — it is a claim backed by proof.</p>
  <p><b>C-E-R paragraph:</b></p><ol><li><b>Claim:</b> "Schools should start at 8:30 a.m."</li><li><b>Evidence:</b> "After Seattle moved start times later, students slept 34 more minutes and grades improved."</li><li><b>Reasoning:</b> "This shows that more sleep helps students learn, so a later start would raise achievement."</li></ol>
  <p>Strong claims are specific and debatable. "Sleep is good" is not arguable. "Schools should start later" is.</p>`,
  examples: [{ title: 'Build a C-E-R', steps: [['Claim', 'DeSoto Central should offer free tutoring after school.'], ['Evidence', 'Students who get regular tutoring tend to earn higher grades (research summary from a credible source).'], ['Reasoning', 'This shows extra help can turn failing grades around, so offering it would help more students graduate.']] }],
  checks: [['Which is an arguable claim?', 'Every student should take a financial literacy class.', ['Money is used to buy things.', 'Some students have jobs.', 'Banks exist.'], 'Someone could disagree.'], ['"This shows that…" usually begins —', 'reasoning', ['the claim', 'the evidence', 'the title'], 'Reasoning explains the evidence.'], ['Which is the strongest evidence?', 'A government study with numbers', ['My cousin\'s opinion', 'A random comment online', 'A guess'], 'Credible and specific.']],
  write: { prompt: 'Write a C-E-R paragraph: Should students be allowed to use phones at lunch? (Claim, one piece of evidence, reasoning.)', checklist: [['States a position (should / should not)', '\\bshould\\b'], ['Includes evidence words (for example, according to, study, survey, %)', '(for example|according to|study|survey|research|%|percent)'], ['Includes reasoning ("this shows" / "this means" / "because")', '(this shows|this means|because|therefore)'], ['At least 4 sentences', '([.!?][^.!?]*){4,}']] },
  showMe: 'Explain the difference between evidence and reasoning.' },

{ id: 'e10', subj: 'eng', week: 10, unit: 3, title: 'Counterclaims & Persuasive Appeals', stds: ['W.9.1'],
  objective: 'I can address a counterclaim with a respectful rebuttal and recognize ethos, pathos, and logos.',
  vocab: [['counterclaim', 'the other side\'s argument'], ['rebuttal', 'your response to the counterclaim'], ['ethos', 'appeal to credibility'], ['pathos', 'appeal to emotion'], ['logos', 'appeal to logic and facts'], ['fallacy', 'a flaw in reasoning (like "everyone is doing it")']],
  learn: `<p>Strong writers don't ignore the other side — they answer it.</p>
  <p><b>Counterclaim formula:</b> "Some people argue that ___. While it is true that ___, ___ because ___."</p>
  <p><b>Appeals:</b> Ethos = "trust me" (experience). Pathos = "feel this" (emotion). Logos = "look at the facts" (data). The best arguments mix all three, but rely mostly on logos.</p>`,
  examples: [{ title: 'Counterclaim + rebuttal', steps: [['Claim', 'School should start later.'], ['Counterclaim', 'Some argue later start times would mess up sports schedules.'], ['Rebuttal', 'While practices might end later, districts that switched simply moved practice times, and students still competed.']] }],
  checks: [['"As a coach for 20 years, I know…" is —', 'ethos', ['pathos', 'logos', 'a fallacy'], 'It builds credibility.'], ['"75% of students improved" is —', 'logos', ['ethos', 'pathos', 'a counterclaim'], 'Facts and numbers.'], ['A good rebuttal should —', 'respectfully answer the other side with reasons', ['insult the other side', 'ignore the other side', 'agree completely'], 'Respect + reasons.']],
  write: { prompt: 'Using the formula, write a counterclaim and rebuttal for this claim: "Students should wear school uniforms."', checklist: [['Introduces the other side ("some people / others / critics")', '(some people|others|critics|opponents|some argue)'], ['Uses a turn word (while / however / although / but)', '(while|however|although|but)'], ['Gives a reason ("because")', '\\bbecause\\b']] },
  showMe: 'Why does addressing a counterclaim make your argument stronger, not weaker?' },

{ id: 'e11', subj: 'eng', week: 11, unit: 4, title: 'Informative Writing & Transitions', stds: ['W.9.2'], only: ['transition'],
  objective: 'I can organize an informative paragraph with a topic sentence, supporting details, and transitions.',
  vocab: [['informative writing', 'explains a topic with facts (not opinions)'], ['topic sentence', 'states the main idea of a paragraph'], ['transition', 'a word or phrase that connects ideas']],
  learn: `<p><b>Paragraph structure (TEA):</b> <b>T</b>opic sentence → <b>E</b>vidence/details → <b>A</b>nalysis/wrap-up.</p>
  <table class="mini"><tr><th>Purpose</th><td>Add</td><td>Contrast</td><td>Example</td><td>Cause/Effect</td><td>Sequence</td></tr><tr><th>Words</th><td>also, furthermore</td><td>however, on the other hand</td><td>for example, for instance</td><td>as a result, therefore</td><td>first, next, finally</td></tr></table>`,
  examples: [{ title: 'Informative paragraph', steps: [['Topic sentence', 'Hurricanes need three conditions to form.'], ['Detail 1 + transition', 'First, the ocean must be at least 80°F.'], ['Detail 2 + transition', 'Next, rising air creates low pressure.'], ['Detail 3 + transition', 'Finally, Earth\'s rotation makes the air spin.'], ['Wrap-up', 'As a result, warm late-summer waters make the Gulf a hurricane zone.']] }],
  checks: [['Which transition shows contrast?', 'however', ['furthermore', 'for example', 'next'], 'However = but.'], ['A topic sentence should —', 'state the main idea of the paragraph', ['be a question only', 'be the last sentence always', 'give an opinion only'], 'It tells what the paragraph is about.'], ['"As a result" shows —', 'cause and effect', ['contrast', 'example', 'addition'], 'Something happened because of something else.']],
  write: { prompt: 'Write an informative paragraph (4–6 sentences) explaining how to get ready for a test. Use at least three transitions.', checklist: [['Uses a sequence transition', '\\b(first|next|then|finally|after that)\\b'], ['Uses another transition', '\\b(also|in addition|for example|as a result|however|therefore)\\b'], ['At least 4 sentences', '([.!?][^.!?]*){4,}'], ['No "I think" (keep it informative)', '^(?![\\s\\S]*\\bi think\\b)']] },
  showMe: 'Explain how transitions help a reader follow your writing.' },

{ id: 'e12', subj: 'eng', week: 12, unit: 4, title: 'Formal Style, Precise Words & Concise Writing', stds: ['L.9.3', 'W.9.2'],
  objective: 'I can write in a formal academic style using precise, concise language.',
  vocab: [['formal style', 'no slang, no "you guys," complete sentences'], ['concise', 'saying it in the fewest clear words'], ['precise', 'exact, specific word choice']],
  learn: `<ul><li><b>Cut filler:</b> "due to the fact that" → "because"; "in order to" → "to"; "at this point in time" → "now."</li><li><b>Swap vague for precise:</b> "good" → "effective, generous, accurate"; "a lot" → "many, much, numerous"; "stuff" → name the thing.</li><li><b>Formal ≠ fancy.</b> It means clear, respectful, and specific.</li></ul>`,
  examples: [{ title: 'Revise', steps: [['Informal', 'So basically the book was really good and it had a lot of stuff about the war.'], ['Remove filler', '"So basically" → delete'], ['Be precise', '"really good" → "compelling"; "a lot of stuff" → "detailed accounts"'], ['Formal', 'The book offered compelling, detailed accounts of the war.']] }],
  checks: [['Most formal?', 'The results were significant.', ['The results were super big.', 'The results were kinda important.', 'The results were, like, huge.'], 'No slang.'], ['Most concise version of "in order to win"?', 'to win', ['for the purpose of winning', 'in order for us to win', 'so that we could be able to win'], 'Fewest words, same meaning.'], ['Most precise replacement for "nice" in "a nice speech"?', 'inspiring', ['good', 'okay', 'fine'], 'Specific meaning.']],
  write: { prompt: 'Rewrite this sentence in formal, concise language: "So basically I think that school lunch is kinda bad because it has a lot of stuff that is not healthy."', checklist: [['Removes "basically"', '^(?![\\s\\S]*basically)'], ['Removes "kinda"', '^(?![\\s\\S]*kinda)'], ['Removes "stuff"', '^(?![\\s\\S]*stuff)'], ['Removes "I think"', '^(?![\\s\\S]*\\bi think\\b)']] },
  showMe: 'When would you use informal language, and when must you use formal language?' },

{ id: 'e13', subj: 'eng', week: 13, unit: 5, title: 'Context Clues & Academic Vocabulary', stds: ['L.9.4'], only: ['vocab-ctx', 'vocab-word'],
  objective: 'I can figure out unknown words using context clues and build my academic vocabulary.',
  vocab: [['context clue', 'nearby words that hint at meaning'], ['definition clue', 'the meaning is stated'], ['contrast clue', 'an opposite is given (but, however, unlike)'], ['example clue', 'examples hint at the meaning']],
  learn: `<p>You will meet words you don't know on every test. Strong readers don't panic — they hunt for clues.</p>
  <ul><li><b>Definition:</b> "The <i>arid</i>, or very dry, land…"</li><li><b>Synonym/restatement:</b> "She was <i>elated</i> — truly overjoyed."</li><li><b>Contrast:</b> "Unlike his <i>timid</i> brother, Jay was bold."</li><li><b>Example:</b> "<i>Precipitation</i>, such as rain, sleet, or snow…"</li></ul>
  <p>Then <b>test it</b>: replace the word with your guess and reread.</p>`,
  examples: [{ title: 'Use a contrast clue', steps: [['Sentence', 'Unlike the lively first half, the second half was lethargic.'], ['Clue word', '"Unlike" → opposite of lively'], ['Guess', 'lethargic = slow, without energy'], ['Test it', '"the second half was slow and low-energy" ✓']] }],
  checks: [['"Precipitation, such as rain or snow, fell all day." The clue type is —', 'example', ['contrast', 'definition', 'none'], '"such as" gives examples.'], ['"Unlike her outgoing sister, Mia was reserved." Reserved means —', 'quiet and shy', ['loud', 'angry', 'tall'], 'Contrast with outgoing.'], ['After guessing a meaning, you should —', 'reread the sentence with your guess', ['skip the word', 'choose the longest answer', 'ask a friend'], 'Check it makes sense.']],
  showMe: 'Pick a word from this lesson and use it in a sentence about your own life that includes a context clue.' },

{ id: 'e14', subj: 'eng', week: 14, unit: 5, title: 'Roots, Figurative Language & Connotation', stds: ['L.9.4', 'L.9.5'], only: ['root-mean', 'root-word', 'fig'],
  objective: 'I can use Greek and Latin roots to unlock words and analyze figurative language and connotation.',
  vocab: [['root', 'the core part of a word that carries meaning'], ['prefix / suffix', 'word parts added to the front / end'], ['connotation', 'the feeling a word carries (positive / negative)'], ['denotation', 'the dictionary meaning']],
  learn: `<p><b>Roots:</b> <i>tele</i> (far) + <i>phon</i> (sound) = telephone. Learn 30 roots and you unlock thousands of words.</p>
  <p><b>Figurative language:</b> simile (like/as), metaphor (is), personification (human traits), hyperbole (exaggeration), idiom (saying), onomatopoeia (sound word), alliteration (repeated first sounds), oxymoron (opposites together).</p>
  <p><b>Connotation:</b> "thrifty" (positive) vs. "cheap" (negative) — same denotation, different feeling.</p>`,
  examples: [{ title: 'Break a word apart', steps: [['Word', 'incredible'], ['Parts', 'in- (not) + cred (believe) + -ible (able to be)'], ['Meaning', 'not able to be believed']] }],
  checks: [['The root "spect" (inspect, spectator) means —', 'look', ['carry', 'write', 'break'], 'Spectators look.'], ['"My backpack weighs a ton" is —', 'hyperbole', ['simile', 'personification', 'alliteration'], 'Extreme exaggeration.'], ['Which has a negative connotation?', 'nosy', ['curious', 'interested', 'inquisitive'], 'Nosy suggests prying.']],
  showMe: 'Write a sentence with personification about DeSoto Central (the building, the gym, the bell…).' },

{ id: 'e15', subj: 'eng', week: 15, unit: 6, title: 'Research: Finding & Using Credible Sources', stds: ['W.9.8'],
  objective: 'I can find credible sources, paraphrase, quote, and cite to avoid plagiarism.',
  vocab: [['credible', 'trustworthy, expert, and accurate'], ['paraphrase', 'restate in your own words (still cite)'], ['plagiarism', 'presenting others\' words or ideas as your own'], ['citation', 'information that tells where you got something']],
  learn: `<p><b>Check sources with CRAAP:</b> <b>C</b>urrency (recent?), <b>R</b>elevance (on topic?), <b>A</b>uthority (expert?), <b>A</b>ccuracy (verified?), <b>P</b>urpose (inform or sell?).</p>
  <ul><li>.gov and .edu are usually reliable; .com may be selling something.</li><li><b>Quote</b> exact words with quotation marks. <b>Paraphrase</b> by changing words AND sentence structure. Cite both.</li><li>Simple in-text citation: (Author last name) or ("Article Title").</li></ul>`,
  examples: [{ title: 'Paraphrase', steps: [['Original', '"Teenagers who sleep fewer than eight hours are more likely to struggle in school."'], ['Bad paraphrase (too close)', 'Teens who sleep less than eight hours are more likely to struggle at school.'], ['Good paraphrase', 'According to sleep researchers, students who get less sleep often have more trouble with their classes (CDC).']] }],
  checks: [['Most credible for a report on diabetes?', 'cdc.gov', ['a candy company website', 'an anonymous forum', 'a celebrity post'], 'Government health agency.'], ['A paraphrase must —', 'use your own words and still be cited', ['copy the exact words', 'never be cited', 'be longer than the original'], 'Own words + citation.'], ['Which is plagiarism?', 'Copying a paragraph without quotation marks or citation', ['Quoting and citing', 'Paraphrasing and citing', 'Writing your own idea'], 'Taking credit for others\' words.']],
  write: { prompt: 'Paraphrase this sentence in your own words and add a citation: "The Mississippi River drains about 41 percent of the continental United States." (National Park Service)', checklist: [['Includes a citation in parentheses', '\\(.*\\)'], ['Does not copy "drains about 41 percent of the continental"', '^(?![\\s\\S]*drains about 41 percent of the continental)']] },
  showMe: 'Explain why using a .gov source might be better than a random website for a research paper.' },

{ id: 'e16', subj: 'eng', week: 16, unit: 7, title: 'Narrative Writing & Revision', stds: ['W.9.3', 'W.9.5'],
  objective: 'I can write a narrative with a hook, sensory details, dialogue, and a meaningful ending — and revise it to make it stronger.',
  vocab: [['narrative', 'a story, true or imagined'], ['hook', 'an opening that grabs attention'], ['sensory details', 'sight, sound, smell, taste, touch'], ['revise', 'improve ideas & organization'], ['edit', 'fix grammar, spelling, punctuation']],
  learn: `<ul><li><b>Hook:</b> start in the action. Not "This story is about…" but "The ball was in my hands with three seconds left."</li><li><b>Show, don't tell:</b> not "I was nervous" but "My hands shook as I tapped my pencil."</li><li><b>Dialogue:</b> new speaker = new paragraph; punctuation inside the quotes.</li><li><b>Ending:</b> show what changed or what was learned.</li></ul>
  <p><b>Revision checklist (ARMS):</b> <b>A</b>dd details, <b>R</b>emove what's off-topic, <b>M</b>ove sentences for better order, <b>S</b>ubstitute stronger words.</p>`,
  examples: [{ title: 'Show, don\'t tell', steps: [['Telling', 'I was excited about the game.'], ['Showing', 'I couldn\'t sit still in sixth period; my leg bounced under the desk and I checked the clock every thirty seconds.']] }],
  checks: [['Which is the best hook?', '"Run!" Marcus yelled as the alarm started blaring.', ['This is a story about a fire drill.', 'One day something happened.', 'I will tell you about my day.'], 'Starts in the action.'], ['"ARMS" is a strategy for —', 'revising', ['editing spelling', 'citing sources', 'outlining'], 'Add, Remove, Move, Substitute.'], ['Which SHOWS anger?', 'She slammed her locker so hard the whole row rattled.', ['She was angry.', 'She felt mad.', 'She is an angry person.'], 'Action reveals the feeling.']],
  write: { prompt: 'Write the opening paragraph of a true story from your life. Start with a hook and include at least two sensory details and one line of dialogue.', checklist: [['Includes dialogue (quotation marks)', '["“”]'], ['Uses sensory words (smell, sound, loud, bright, cold, taste…)', '\\b(smell|sound|heard|loud|quiet|bright|dark|cold|hot|taste|felt|rough|smooth|sweet|sour)\\w*'], ['At least 4 sentences', '([.!?][^.!?]*){4,}']] },
  showMe: 'What is one moment from your own life that would make a good story? Why?' },

/* ============================ READING ============================ */
{ id: 'r1', subj: 'read', week: 1, unit: 0, passage: 'delmar', title: 'Active Reading & Citing Evidence', stds: ['RL.9.1', 'RI.9.1'],
  objective: 'I can annotate a text and cite the strongest evidence to support an answer.',
  vocab: [['annotate', 'mark up a text while reading (underline, circle, note)'], ['textual evidence', 'words from the text that prove your answer'], ['cite', 'to quote or point to exact evidence']],
  learn: `<p>Good readers read with a pencil. Use these marks:</p>
  <ul><li><b>Underline</b> important ideas · <b>Circle</b> unknown words · <b>?</b> confusing parts · <b>!</b> surprises · <b>★</b> possible theme</li></ul>
  <p><b>Answer with RACE:</b> <b>R</b>estate the question, <b>A</b>nswer it, <b>C</b>ite evidence ("In paragraph 2, the text says…"), <b>E</b>xplain how the evidence proves your answer.</p>
  <p><b>Strongest evidence</b> = the detail that most DIRECTLY proves the answer — not just any detail from the right paragraph.</p>`,
  model: `<p><b>Question:</b> How does Andre feel about the store closing?</p><p><i>Think-aloud:</i> "The narrator says Granddad thinks it's time to sell, and then: 'It didn't.' That short sentence tells me Andre doesn't agree. He also sweeps 'slowly' — like he doesn't want it to end. And he knows 'where every bolt lived.' That's my strongest evidence: it shows how much the store is part of him."</p><p><b>RACE answer:</b> Andre is sad about the store closing. The text says he "knew where every bolt lived," which shows the store has been part of his life for years, so losing it hurts.</p>`,
  checks: [['RACE stands for —', 'Restate, Answer, Cite, Explain', ['Read, Ask, Copy, End', 'Restate, Argue, Conclude, Edit', 'Review, Answer, Check, Explain'], 'The four parts of a strong answer.'], ['The STRONGEST evidence is the detail that —', 'most directly proves the answer', ['is the longest', 'comes first in the text', 'is the most interesting'], 'Directly proves it.'], ['Circling a word while annotating usually means —', 'you don\'t know what it means', ['it\'s the theme', 'it\'s your favorite', 'it\'s spelled wrong'], 'Circle unknown words.']],
  showMe: 'Write a RACE answer: What kind of person is Mrs. Pruitt? Use evidence from the story.' },

{ id: 'r2', subj: 'read', week: 2, unit: 0, passage: 'static', title: 'Making Inferences', stds: ['RL.9.1'],
  objective: 'I can make inferences by combining text clues with what I already know.',
  vocab: [['inference', 'a logical conclusion from clues + background knowledge'], ['implicit', 'suggested, not stated'], ['explicit', 'stated directly']],
  learn: `<p><b>Inference formula:</b> Text clue + What I know = Inference.</p>
  <p>Authors don't tell you everything. They SHOW you clues and trust you to figure it out. If a character slams a door, the author doesn't need to say "she was angry."</p>
  <p>An inference must be <b>supported</b> by the text. A guess with no clues is not an inference.</p>`,
  model: `<p><b>Question:</b> How does Grandma Lou feel about the radio?</p><p><i>Think-aloud:</i> "Clue: her voice was 'light, but she didn't come look.' What I know: when people avoid something but act casual, they're often hiding feelings. Clue: the radio 'hasn't worked right since your granddaddy passed.' So I infer the radio reminds her of her husband, and she's grieving."</p>`,
  checks: [['An inference is —', 'a conclusion based on clues and what you know', ['a fact stated in the text', 'a random guess', 'the title'], 'Clues + knowledge.'], ['A character keeps checking the clock and tapping her foot. You can infer she is —', 'impatient or nervous', ['asleep', 'happy and relaxed', 'hungry'], 'Body language clues.'], ['Which is EXPLICIT?', 'The text says, "Grandma Lou sat down in Granddaddy\'s chair."', ['Grandma Lou misses her husband.', 'The narrator is kind.', 'The radio is special.'], 'Directly stated.']],
  showMe: 'What can you infer about the narrator of "Static" from the line "I believed in screwdrivers"? Use the formula: clue + what I know = inference.' },

{ id: 'r3', subj: 'read', week: 3, unit: 1, passage: 'tryout', title: 'Determining Theme', stds: ['RL.9.2'],
  objective: 'I can determine a theme and explain how it develops through the story.',
  vocab: [['theme', 'the message about life or human nature'], ['topic', 'a word or phrase (courage, friendship) — NOT the theme'], ['universal', 'true for many people, not just these characters']],
  learn: `<p><b>Topic vs. theme:</b> "honesty" is a topic. "Being honest about your mistakes earns respect" is a theme.</p>
  <p><b>Find the theme in 4 steps:</b></p><ol><li>What does the main character want?</li><li>What is the conflict?</li><li>How does the character change or what does he learn?</li><li>Turn the lesson into a sentence about LIFE — no character names.</li></ol>`,
  model: `<p><i>Think-aloud on "Cut Day":</i> "Ezekiel wants to make the team. Conflict: he's cut. Change: instead of making excuses, he admits 'I was wrong.' Result: Coach gives him a chance. Lesson about life: <b>Owning your mistakes can open doors that excuses close.</b> No names — it's universal."</p>`,
  checks: [['Which is a THEME (not a topic)?', 'True friends support you even when it costs them something.', ['friendship', 'loyalty and trust', 'Ezekiel and Cam'], 'A complete sentence about life.'], ['A theme should NOT include —', 'specific character names', ['a full sentence', 'a lesson', 'a universal idea'], 'Themes apply to everyone.'], ['To find theme, focus on how the main character —', 'changes or what he learns', ['looks', 'dresses', 'is named'], 'Change reveals the message.']],
  showMe: 'Think of a movie you like. What is its theme? Write it as a complete sentence with no character names.' },

{ id: 'r4', subj: 'read', week: 4, unit: 1, passage: 'river', title: 'Central Idea & Objective Summary', stds: ['RI.9.2'],
  objective: 'I can determine the central idea of an informational text and write an objective summary.',
  vocab: [['central idea', 'what the WHOLE text is mostly about'], ['supporting details', 'facts that develop the central idea'], ['objective summary', 'a short retelling with no opinions']],
  learn: `<p><b>Central idea test:</b> Does EVERY paragraph support it? If it only fits one paragraph, it's a detail.</p>
  <p><b>Three questions:</b> 1) What's the topic? 2) What does the author keep saying about it? 3) Put it together in ONE sentence.</p>
  <p><b>Objective summary rules:</b> include the central idea + key points, in order, in your own words. NO opinions ("I think," "interesting," "boring").</p>`,
  model: `<p><i>Think-aloud on "A River That Wants to Move":</i> "Topic: the Mississippi River changing course. Paragraph 1: rivers shift naturally. 2: it was trying to shift to the Atchafalaya. 3: engineers built a structure to stop it. 4: people debate whether that can last. Every paragraph is about the river trying to move and people trying to stop it. <b>Central idea:</b> People are working to keep the Mississippi in its channel, but whether that can last is debated."</p>`,
  checks: [['A central idea must —', 'be supported by the whole text', ['appear in the first sentence', 'be one interesting detail', 'include an opinion'], 'All paragraphs support it.'], ['Which belongs in an OBJECTIVE summary?', 'The structure was built in 1963 to control the river.', ['This was a really boring article.', 'I think engineers are smart.', 'The best part was the hose comparison.'], 'No opinions.'], ['A summary should be —', 'short and in your own words', ['longer than the article', 'copied word for word', 'only about the first paragraph'], 'Brief and original.']],
  showMe: 'Write a 2–3 sentence objective summary of "A River That Wants to Move."' },

{ id: 'r5', subj: 'read', week: 5, unit: 2, passage: 'wings', title: 'How Characters Develop', stds: ['RL.9.3'],
  objective: 'I can analyze how complex characters change, interact, and move the plot forward.',
  vocab: [['dynamic character', 'changes during the story'], ['static character', 'stays the same'], ['motivation', 'why a character acts'], ['characterization', 'how the author reveals a character (STEAL)']],
  learn: `<p><b>STEAL</b> — how authors reveal character: <b>S</b>peech, <b>T</b>houghts, <b>E</b>ffect on others, <b>A</b>ctions, <b>L</b>ooks.</p>
  <p>Ask: What does the character WANT? What gets in the way? What choice do they make? How does it change them — and the plot?</p>`,
  model: `<p><i>Think-aloud on "Wax Wings":</i> "Dez wants to go higher. Marcus pushes him (effect of another character). Uncle Ray's truck is gone (no one to stop him). His action — stacking the pallets — causes the fall, which moves the plot to the hospital. Uncle Ray's quiet speech shows love; I think Dez will change and learn patience."</p>`,
  checks: [['STEAL stands for —', 'Speech, Thoughts, Effect on others, Actions, Looks', ['Story, Theme, Ending, Author, Lesson', 'Setting, Time, Events, Action, Lines', 'Speech, Title, Emotion, Age, Location'], 'Five ways to show character.'], ['A character who learns and changes is —', 'dynamic', ['static', 'flat', 'minor'], 'Dynamic = changes.'], ['Why a character acts is called —', 'motivation', ['setting', 'theme', 'conflict'], 'What drives them.']],
  showMe: 'Use STEAL to describe Uncle Ray. Give at least two pieces of evidence.' },

{ id: 'r6', subj: 'read', week: 6, unit: 2, passage: 'hamer', title: 'How Ideas & Events Connect', stds: ['RI.9.3'],
  objective: 'I can analyze how an author connects people, ideas, and events — including cause and effect.',
  vocab: [['cause', 'why something happens'], ['effect', 'what happens as a result'], ['chronological', 'in time order']],
  learn: `<p>Informational texts are chains of connections. Signal words help:</p>
  <ul><li><b>Cause/effect:</b> because, as a result, led to, so, therefore</li><li><b>Time:</b> in 1962, then, later, the next year</li><li><b>Contrast:</b> however, despite, but</li></ul>
  <p>Draw a chain: Event → Result → Next event. Ask: how does each step lead to the next?</p>`,
  model: `<p><i>Think-aloud on Fannie Lou Hamer:</i> "She learns she has the right to vote → she tries to register → she's forced off the plantation → instead of quitting, she organizes → she's beaten in jail → she helps start a party and testifies on TV → her voice helps push the Voting Rights Act. Every setback leads to more action. That chain shows her determination."</p>`,
  checks: [['"As a result" signals —', 'an effect', ['a cause', 'a contrast', 'an example'], 'Result = effect.'], ['What CAUSED Hamer to lose her home on the plantation?', 'She refused to withdraw her voter registration.', ['She failed a test.', 'She moved to Chicago.', 'She testified on TV.'], 'Cause → effect.'], ['A passage organized by dates is —', 'chronological', ['compare/contrast', 'problem/solution', 'spatial'], 'Time order.']],
  showMe: 'Draw (or write) a cause-and-effect chain of at least four events from Fannie Lou Hamer\'s life.' },

{ id: 'r7', subj: 'read', week: 7, unit: 3, passage: 'porch', title: 'Figurative Language & Tone in Poetry', stds: ['RL.9.4'],
  objective: 'I can analyze how word choice and figurative language create meaning and tone.',
  vocab: [['tone', 'the author\'s attitude (hopeful, bitter, tender)'], ['mood', 'how the reader feels'], ['symbol', 'something that stands for a bigger idea'], ['stanza', 'a group of lines in a poem']],
  learn: `<p>Poets choose every word on purpose. Ask: <b>Why THIS word?</b></p>
  <ul><li>Find the figurative language (simile, metaphor, personification, symbol).</li><li>Ask what is being compared and what that comparison suggests.</li><li>Collect "feeling words" — they reveal tone.</li></ul>
  <p><b>Tone words to know:</b> nostalgic, tender, hopeful, bitter, sarcastic, solemn, joyful, anxious, reflective, bittersweet.</p>`,
  model: `<p><i>Think-aloud on "Porch Light":</i> "'Tiny planets around a sixty-watt sun' — a metaphor that makes an ordinary porch light feel like the center of a universe. That fits the grandmother: the light is a symbol of welcome and guidance. Words like 'baby,' 'home,' and 'You've come this far' feel tender and reflective."</p>`,
  checks: [['Tone is —', 'the author\'s attitude', ['the reader\'s feeling', 'the setting', 'the rhyme'], 'Mood is the reader\'s feeling.'], ['In "Porch Light," the light is a symbol of —', 'welcome and guidance', ['danger', 'electricity costs', 'summer'], 'It guides people home.'], ['Which is a TONE word?', 'nostalgic', ['stanza', 'simile', 'narrator'], 'An attitude.']],
  showMe: 'Pick one line from "Porch Light." What does it mean, and how does it make you feel?' },

{ id: 'r8', subj: 'read', week: 8, unit: 3, passage: 'blues', title: 'Word Meaning in Informational Texts', stds: ['RI.9.4'],
  objective: 'I can determine the meaning of words and phrases in informational texts, including technical and connotative meanings.',
  vocab: [['technical term', 'a word specific to a subject (sediment, Coriolis effect)'], ['connotative meaning', 'the feeling a word adds'], ['figurative meaning', 'a non-literal meaning']],
  learn: `<p>In nonfiction, word choice reveals both meaning AND the author's attitude.</p>
  <ul><li><b>Technical words:</b> look for a definition nearby, often right after a comma or dash.</li><li><b>Loaded words:</b> "defiance," "brutally," "weirdest" add emotion and show the author's viewpoint.</li><li><b>Figurative phrases:</b> "pushed" and "pulled" in the Great Migration aren't literal shoves.</li></ul>`,
  model: `<p><i>Think-aloud on "How the Blues Traveled North":</i> "'Call-and-response' — the text says it's rooted in work songs. I picture a leader singing and a group answering. And 'pushed out by segregation… pulled north by jobs' — these are reasons, not physical pushes. The author chose them to show forces working in two directions."</p>`,
  checks: [['A technical term is often defined —', 'right after a comma or dash nearby', ['only in a dictionary', 'never in the text', 'at the end of the book'], 'Authors often define technical words in the sentence.'], ['"Brutally beaten" shows the author views the event as —', 'cruel and serious', ['minor', 'funny', 'fair'], 'Strong word choice.'], ['"Pushed" and "pulled" in a migration passage are —', 'figurative reasons for moving', ['literal shoves', 'train parts', 'dance moves'], 'Not literal.']],
  showMe: 'Find one word in "How the Blues Traveled North" that shows the author\'s attitude. What attitude does it show?' },

{ id: 'r10', subj: 'read', week: 10, unit: 4, passage: 'hurricane', title: 'Text Structure in Informational Texts', stds: ['RI.9.5'],
  objective: 'I can identify how an author structures a text and why.',
  vocab: [['text structure', 'how information is organized'], ['sequence', 'steps or stages in order'], ['cause/effect', 'reasons and results'], ['problem/solution', 'an issue and how it is solved']],
  learn: `<table class="mini"><tr><th>Structure</th><td>Sequence</td><td>Cause/Effect</td><td>Compare/Contrast</td><td>Problem/Solution</td><td>Description</td></tr><tr><th>Signal words</th><td>first, next, stages</td><td>because, as a result</td><td>similarly, however</td><td>problem, solved</td><td>for example, features</td></tr></table>
  <p>Authors often mix structures: a whole article might be cause/effect, while one paragraph is a sequence. Ask: <b>Why</b> did the author organize it THIS way?</p>`,
  model: `<p><i>Think-aloud on "Anatomy of a Hurricane":</i> "Paragraph 2 explains WHY storms grow — warm water causes rising air, which causes low pressure — cause and effect. Paragraph 3 goes depression → storm → hurricane — stages, a sequence. That order helps readers understand the process step by step."</p>`,
  checks: [['"First… next… finally" signals —', 'sequence', ['compare/contrast', 'problem/solution', 'description'], 'Order of steps.'], ['"As a result" signals —', 'cause/effect', ['sequence', 'description', 'compare/contrast'], 'Result.'], ['Why might a science article use sequence?', 'To explain a process step by step', ['To argue an opinion', 'To tell a fictional story', 'To compare two people'], 'Processes happen in order.']],
  showMe: 'Explain how the structure of "Anatomy of a Hurricane" helps a reader understand how a storm forms.' },

{ id: 'r11', subj: 'read', week: 11, unit: 4, passage: 'science', title: 'Structure in Drama & Fiction', stds: ['RL.9.5'],
  objective: 'I can analyze how authors use structure (flashbacks, pacing, stage directions) to create tension and meaning.',
  vocab: [['stage directions', 'italic/bracketed notes describing setting and actions'], ['pacing', 'how fast or slow a story moves'], ['flashback', 'a scene from the past'], ['suspense', 'tension about what will happen']],
  learn: `<ul><li><b>Drama</b> tells a story through dialogue and stage directions. Pauses and actions in brackets show emotion.</li><li><b>Pacing:</b> short lines and short sentences speed up tension; long description slows it down.</li><li><b>Flashbacks</b> add background; <b>foreshadowing</b> hints at what's coming.</li></ul>`,
  model: `<p><i>Think-aloud on "The Volcano Problem":</i> "The quick back-and-forth — 'The fair is Friday.' 'I know.' 'It is Tuesday.' — speeds things up and builds pressure. Then '[A long pause.]' slows everything down. We wait to see if Tasha explodes or helps. That pause creates suspense."</p>`,
  checks: [['Stage directions tell —', 'setting and actions', ['the theme', 'the author\'s biography', 'the rhyme scheme'], 'Not spoken aloud.'], ['Short, quick lines of dialogue usually —', 'increase tension', ['slow the story', 'end the story', 'describe setting'], 'Fast pace.'], ['A scene from the past is a —', 'flashback', ['foreshadowing', 'stage direction', 'resolution'], 'Back in time.']],
  showMe: 'Why do you think the playwright included "[A long pause]" right before Tasha\'s plan? What does it make the audience feel?' },

{ id: 'r12', subj: 'read', week: 12, unit: 5, passage: 'static', title: 'Point of View & Author\'s Purpose', stds: ['RL.9.6', 'RI.9.6'],
  objective: 'I can analyze point of view in literature and determine an author\'s purpose in nonfiction.',
  vocab: [['first person', 'narrator uses "I"'], ['third person limited', 'narrator uses "he/she," knows one character\'s thoughts'], ['third person omniscient', 'narrator knows everyone\'s thoughts'], ['author\'s purpose', 'to inform, persuade, or entertain (and why)']],
  learn: `<p><b>Point of view controls what readers know.</b> In first person, we only know what the narrator knows — and we might not get the whole truth.</p>
  <p><b>Author's purpose (nonfiction):</b> go beyond "to inform." Ask: <i>Why</i> include THIS detail, THIS example, THIS quote? E.g., "to help readers picture…," "to show the gap between…," "to build trust with…"</p>`,
  model: `<p><i>Think-aloud on "Static":</i> "It's first person — 'I found the radio.' We never get inside Grandma Lou's head. That's powerful: like the narrator, we have to read her actions — sitting in the chair, eyes closed — to understand her grief. If she told the story, we'd learn her memories but lose the surprise."</p>`,
  checks: [['"I opened the door" is —', 'first person', ['second person', 'third person limited', 'omniscient'], 'Narrator says "I."'], ['A narrator who knows every character\'s thoughts is —', 'omniscient', ['first person', 'limited', 'unreliable'], 'All-knowing.'], ['Why might an author open with a story about one person?', 'To hook readers and make the topic personal', ['To fill space', 'To confuse readers', 'To list facts'], 'Anecdotes engage.']],
  showMe: 'Rewrite two sentences of "Static" from Grandma Lou\'s point of view. What new information can she share?' },

{ id: 'r13', subj: 'read', week: 13, unit: 6, passage: 'sleep', title: 'Evaluating an Argument', stds: ['RI.9.8'],
  objective: 'I can trace an argument, judge whether its evidence is relevant and sufficient, and spot weak reasoning.',
  vocab: [['relevant', 'directly connected to the claim'], ['sufficient', 'enough evidence to be convincing'], ['fallacy', 'faulty reasoning'], ['bias', 'one-sided viewpoint']],
  learn: `<p><b>Trace it:</b> Claim → Reasons → Evidence for each reason → Counterclaim & rebuttal.</p>
  <p><b>Judge it:</b> Is each piece of evidence <b>relevant</b> (on topic)? <b>Sufficient</b> (enough)? <b>Credible</b> (expert source)?</p>
  <p><b>Common fallacies:</b> bandwagon ("everyone agrees"), attacking the person, either/or ("we must do this or schools will fail"), hasty generalization (one example → big conclusion).</p>`,
  model: `<p><i>Think-aloud on "Let Teenagers Sleep":</i> "Claim: start at 8:30. Reason 1: biology — supported by CDC and AAP (credible). Reason 2: it works — Seattle study (strong). Counterclaim: buses and sports — answered with planning. Weakness: the conclusion mentions 'safer teen drivers' with NO evidence. That claim isn't sufficiently supported."</p>`,
  checks: [['Evidence is RELEVANT if it —', 'directly connects to the claim', ['is very long', 'is surprising', 'uses big words'], 'On topic.'], ['"Everyone is switching, so we should too" is —', 'the bandwagon fallacy', ['strong evidence', 'a counterclaim', 'logos'], 'Popularity ≠ proof.'], ['Which claim in "Let Teenagers Sleep" lacks evidence?', 'Later start times make teen drivers safer.', ['Teens\' internal clocks shift later.', 'Seattle students slept more.', 'The AAP recommended 8:30.'], 'No data given for drivers.']],
  showMe: 'Is "Let Teenagers Sleep" convincing to you? Give one strength and one weakness of the argument.' },

{ id: 'r14', subj: 'read', week: 14, unit: 6, passage: 'phones', title: 'Comparing Arguments & Spotting Bias', stds: ['RI.9.8', 'RI.9.6'],
  objective: 'I can evaluate the strength of reasons and evidence and recognize how an author\'s perspective shapes an argument.',
  vocab: [['perspective', 'the author\'s position and background'], ['anecdote', 'a short personal story used as evidence'], ['credibility', 'how trustworthy the writer or source is']],
  learn: `<p>Not all evidence is equal:</p><ol><li><b>Strongest:</b> research, data, expert reports</li><li><b>Medium:</b> expert opinion, real examples</li><li><b>Weakest:</b> personal anecdotes, opinions without support</li></ol>
  <p>Notice who the author is. A student columnist writes differently than a scientist. Perspective isn't bad — but readers should notice it.</p>`,
  model: `<p><i>Think-aloud on "Put the Phones Away":</i> "Jordan's strongest evidence is the UNESCO report. His one-week experiment is just an anecdote — interesting, but weak. Paragraph 4 about kindness has no evidence at all. His tone is honest and reasonable, which builds trust with student readers."</p>`,
  checks: [['Which is the WEAKEST evidence?', 'A personal anecdote about one week', ['A UN agency report', 'A university study', 'Government data'], 'One person\'s experience.'], ['An author\'s perspective is —', 'their viewpoint shaped by who they are', ['always wrong', 'the same as facts', 'the title'], 'Their position.'], ['Jordan admits he checks his phone too much in order to —', 'build trust with readers', ['prove phones are good', 'change topics', 'list evidence'], 'Ethos.']],
  showMe: 'Compare "Let Teenagers Sleep" and "Put the Phones Away." Which argument is stronger, and why?' },

{ id: 'r15', subj: 'read', week: 15, unit: 7, passage: 'gettysburg', title: 'Reading Historic U.S. Documents', stds: ['RI.9.9', 'RI.9.4', 'RI.9.6'],
  objective: 'I can read a seminal U.S. document closely and explain its purpose, ideas, and powerful language.',
  vocab: [['seminal', 'highly influential; a foundation for later ideas'], ['dedicate', 'to set apart for a purpose'], ['consecrate / hallow', 'to make sacred'], ['score', 'twenty']],
  learn: `<p>Historic texts can feel hard because the language is older. Use this strategy:</p>
  <ol><li><b>Context first:</b> When? Who? Why? (November 1863, President Lincoln, dedicating a cemetery during the Civil War.)</li><li><b>Chunk it:</b> read one sentence at a time and translate into modern words.</li><li><b>Find the big moves:</b> past → present → future.</li><li><b>Notice the language:</b> repetition and parallel structure ("of… by… for…").</li></ol>`,
  model: `<p><i>Think-aloud:</i> "'Four score and seven years ago' = 87 years before 1863 = 1776, the Declaration of Independence. So Lincoln starts with the nation's founding promise — 'all men are created equal.' Then the war 'testing' that promise. Then he says the living must finish the work. Translation: 'Honor these soldiers by making sure freedom and democracy survive.'"</p>`,
  checks: [['"Four score and seven" equals —', '87', ['47', '27', '74'], '4 × 20 + 7.'], ['Lincoln\'s speech moves through —', 'past, present, and future', ['only the battle details', 'a list of names', 'a comparison of two generals'], 'Three time frames.'], ['"Government of the people, by the people, for the people" uses —', 'parallel structure', ['a simile', 'onomatopoeia', 'a flashback'], 'Repeated pattern.']],
  showMe: 'Translate the last sentence of the Gettysburg Address into your own modern words.' },

{ id: 'r16', subj: 'read', week: 16, unit: 7, passage: 'wings', title: 'Classic Poetry & Modern Retellings', stds: ['RL.9.9', 'RL.9.4'],
  objective: 'I can analyze a classic poem and explain how a modern author draws on and transforms a source text.',
  vocab: [['allusion', 'a reference to a well-known story, person, or event'], ['retelling', 'a new version of an older story'], ['transform', 'to change in form or meaning']],
  learn: `<p>Authors borrow from myths, the Bible, Shakespeare, and history all the time. When you spot a source, compare:</p>
  <ul><li><b>Same:</b> characters' roles, conflict, theme</li><li><b>Changed:</b> setting, ending, message</li><li><b>Why change it?</b> To speak to today's readers, or to offer hope instead of tragedy.</li></ul>
  <p>Also read Paul Laurence Dunbar's "We Wear the Mask" (1895) in practice: a classic about hiding pain behind a smile.</p>`,
  model: `<p><i>Think-aloud on "Wax Wings":</i> "Uncle Ray = Daedalus (builds the wings, gives the warning). Dez = Icarus. Nine feet = flying too close to the sun. Marcus and his followers add a modern pressure the myth didn't have. And the ending changes: Icarus dies, but Dez gets 'six weeks, then six feet.' The author turns a tragedy into a second chance."</p>`,
  checks: [['A reference to a famous myth or story is an —', 'allusion', ['alliteration', 'anecdote', 'antonym'], 'It alludes to a source.'], ['In "Wax Wings," who matches Icarus?', 'Dez', ['Uncle Ray', 'Marcus', 'the little sister'], 'He flies too high.'], ['How did the author change the myth\'s ending?', 'The character survives and gets another chance.', ['The character drowns.', 'The ending is identical.', 'The father falls instead.'], 'Tragedy → second chance.']],
  showMe: 'If you wrote a modern retelling of a famous story, which story would you choose and what would you change?' }
);
