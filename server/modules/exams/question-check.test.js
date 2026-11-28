const test = require('node:test');
const assert = require('node:assert/strict');
const { checkQuestions } = require('./question-check');

const opts = (correctIdx = [0], n = 4) => Array.from({ length: n }, (_, i) => ({ text: `opt ${i}`, isCorrect: correctIdx.includes(i) }));

test('a clean paper has no issues', () => {
  const r = checkQuestions([
    { _id: 'a', type: 'MCQ', questionText: 'Q1', options: opts([2]) },
    { _id: 'b', type: 'INTEGER', questionText: 'Q2', correctAnswerText: ' 12 ' },
    { _id: 'c', type: 'NUMERICAL', questionText: 'Q3', correctAnswerText: '2.5' },
    { _id: 'd', type: 'MULTIPLE_CORRECT', questionText: 'Q4', options: opts([0, 3]) },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.total, 4);
  assert.equal(r.totalMarks, 16);
  assert.deepEqual(r.byType, { MCQ: 1, INTEGER: 1, NUMERICAL: 1, MULTIPLE_CORRECT: 1 });
});

test('MCQ needs exactly 4 options and exactly 1 answer', () => {
  const r = checkQuestions([
    { type: 'MCQ', questionText: 'three options', options: opts([0], 3) },
    { type: 'MCQ', questionText: 'two answers', options: opts([0, 1]) },
    { type: 'MCQ', questionText: 'no answer', options: opts([]) },
    { type: 'ASSERTION_REASON', questionText: 'AR', options: opts([], 5) },
  ]);
  assert.equal(r.issueCount, 4);
  assert.deepEqual(r.issues[0].problems, ['Has 3 option(s), needs exactly 4']);
  assert.deepEqual(r.issues[1].problems, ['2 answers marked, needs exactly 1']);
  assert.deepEqual(r.issues[2].problems, ['No correct answer marked']);
  assert.equal(r.issues[3].problems.length, 2);
  assert.equal(r.issues[0].number, 1);
});

test('integer answer must be a whole number', () => {
  const r = checkQuestions([
    { type: 'INTEGER', questionText: 'a', correctAnswerText: '2.5' },
    { type: 'INTEGER', questionText: 'b', correctAnswerText: '' },
    { type: 'INTEGER', questionText: 'c', correctAnswerText: '-3' },
    { type: 'NUMERICAL', questionText: 'd', correctAnswerText: 'abc' },
  ]);
  assert.equal(r.issueCount, 3);
  assert.match(r.issues[0].problems[0], /not a whole number/);
  assert.match(r.issues[1].problems[0], /missing/);
  assert.match(r.issues[2].problems[0], /not a number/);
});

test('empty options, empty text and bad marks are reported; image-only is fine', () => {
  const r = checkQuestions([
    { type: 'MCQ', questionText: '<p> </p>', options: [{ text: '', imageUrl: '' }, ...opts([0], 3)] },
    { type: 'MCQ', questionText: '<img src="x.png">', options: [{ imageUrl: 'a.png', isCorrect: true }, ...opts([], 3)] },
    { type: 'MCQ', questionText: 'zero marks', marks: 0, options: opts([1]) },
  ]);
  assert.equal(r.issueCount, 2);
  assert.ok(r.issues[0].problems.includes('Question text is empty'));
  assert.ok(r.issues[0].problems.includes('1 option(s) are empty'));
  assert.deepEqual(r.issues[1].problems, ['Marks must be more than 0']);
  assert.equal(r.issues[1].number, 3);
});

test('snippet is plain text and short', () => {
  const r = checkQuestions([{ type: 'MCQ', questionText: `<b>${'x'.repeat(200)}</b>`, options: opts([], 4) }]);
  assert.equal(r.issues[0].snippet.length, 80);
  assert.ok(!r.issues[0].snippet.includes('<'));
});
