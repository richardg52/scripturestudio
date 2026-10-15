# Jaguar Ascend Hub: Grade 9 Tutoring Program

**Designed and created by Dr. Richard G. Clark.**
Copyright © 2026 Dr. Richard G. Clark. All rights reserved.

A self-contained tutoring hub for a 9th-grade student at DeSoto Central High School (Southaven, MS),
covering **Algebra I**, **English I**, and **Reading**. It is aligned to the Mississippi College & Career
Readiness Standards (MS CCRS). Open `index.html` in any modern browser. No server or install is needed.

## What's inside
- **Coach J, the built-in tutor.** Before each new type of problem, Coach J solves an example step by step
  (typed out, with optional voice). Then the student solves a fresh one. On a miss, Coach J walks through the
  student's own problem and offers a similar one to retry.
- **18-week semester plan**: 45 lessons (Warm-up → Learn → Together → On your own → Exit ticket), each with timed steps.
- **Algebra I**: 58 problem generators, so problems never repeat. Includes a 3-week Foundations Bootcamp.
- **English I**: 400+ questions plus writing tasks with self-check checklists.
- **Reading**: 18 passages (4 reserved for the post-test) and 188 questions.
- **Assessments**: pre-tests, 24 unit quizzes, 45 exit tickets, **The Ascend** (combined exam ×3) and post-tests.
  All are timed and auto-graded, with balanced answer keys. Tools lock during tests, and tests can be paused and resumed.
- **Report card**: weighted grades, pre→post growth, standards mastery, and practice stats. Printable.
- **Parent Portal** (PIN, default `1234`): settings, accommodations (extended time, read-aloud), school team,
  scoring of written work, backup export/import.

Progress is stored in the browser (`localStorage`). Use **Parent Portal → Export backup** regularly.

## Files
| File | Purpose |
|---|---|
| `index.html` | App shell, design system, icons, study tools |
| `js/math.js` | Algebra I standards, units, problem generators |
| `js/english.js` | English I standards, units, banks and items |
| `js/reading.js`, `js/reading-post.js` | Passages and questions (post-test passages are reserved) |
| `js/lessons-*.js` | Lesson content |
| `js/app.js` | State, test/practice engine, grading, analytics |
| `js/coach.js` | Coach J virtual tutor |
| `js/views.js` | Screens |
