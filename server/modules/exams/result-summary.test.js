const test = require('node:test');
const assert = require('node:assert/strict');
const { weakestChapters, resultSummary, missingChapterIds } = require('./result-summary');

const q = (subject, chapter, state, marks = 4) => ({
  subject: { name: subject },
  chapterName: chapter,
  marks,
  attempted: state !== 'skip',
  isCorrect: state === 'right',
  marksObtained: state === 'right' ? marks : state === 'wrong' ? -1 : 0,
});

test('weakest 3 chapters, weakest first; all-correct chapters left out', () => {
  const qs = [
    q('Physics', 'Kinematics', 'right'), q('Physics', 'Kinematics', 'right'),
    q('Physics', 'Optics', 'wrong'), q('Physics', 'Optics', 'right'),
    q('Chemistry', 'Mole Concept', 'skip'), q('Chemistry', 'Mole Concept', 'wrong'),
    q('Maths', 'Limits', 'right'), q('Maths', 'Limits', 'right'), q('Maths', 'Limits', 'wrong'),
    q('Maths', 'Vectors', 'wrong'),
  ];
  const weak = weakestChapters(qs);
  assert.deepEqual(weak.map((c) => c.chapter), ['Vectors', 'Mole Concept', 'Optics']);
  assert.deepEqual(
    { ...weak[1] },
    { subject: 'Chemistry', chapter: 'Mole Concept', score: -1, totalMarks: 8, totalQuestions: 2, correct: 0, wrong: 1, unattempted: 1, accuracy: 0 },
  );
});

test('equal accuracy: lower score % is weaker (wrong is worse than skipped)', () => {
  const weak = weakestChapters([q('P', 'A', 'skip'), q('P', 'B', 'wrong')]);
  assert.deepEqual(weak.map((c) => c.chapter), ['B', 'A']);
});

test('chapter name from id map, then topic, then General', () => {
  const map = new Map([['c1', 'Thermodynamics']]);
  const weak = weakestChapters([
    { chapter: 'c1', attempted: false },
    { topic: { name: 'Waves' }, attempted: false },
    { attempted: false },
  ], map);
  assert.deepEqual(weak.map((c) => c.chapter).sort(), ['General', 'Thermodynamics', 'Waves']);
  assert.deepEqual(missingChapterIds([{ chapter: 'c1' }, { chapter: 'c1' }, { chapterName: 'X', chapter: 'c2' }]), ['c1']);
});

test('summary numbers', () => {
  const s = resultSummary({
    detailedQuestions: [q('P', 'A', 'right'), q('P', 'A', 'wrong'), q('P', 'A', 'right'), q('P', 'A', 'skip')],
    score: 7, totalMarks: 16, timeUsedSeconds: 1800.4, durationMinutes: 60, expectedJeePercentile: 97.43,
  });
  assert.deepEqual(s, {
    score: 7, totalMarks: 16, accuracy: 67, correct: 2, wrong: 1, unattempted: 1,
    timeUsedSeconds: 1800, durationMinutes: 60, expectedJeePercentile: 97.43,
  });
  assert.equal(resultSummary({ detailedQuestions: [] }).accuracy, 0);
});
