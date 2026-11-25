const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeAnswer, findStudentAnswer, isTypedAnswerQuestion } = require('./answer-grading');
const { normalizeAnswerPayload, inlineQuestionImages } = require('./exam.controller');

const integerQ = { _id: 'q21', type: 'INTEGER', options: [], correctAnswerText: '2', marks: 4, negativeMarks: 1 };

// QA retest 4.1: typing 2 on an INTEGER question and tapping Save & Next was
// graded "Skipped". Walk the whole path: app payload -> normalize -> grade.
for (const [label, body] of [
  ['current app (numericAnswer number)', { questionId: 'q21', numericAnswer: 2, status: 'ANSWERED' }],
  ['numericAnswer string', { questionId: 'q21', numericAnswer: '2', status: 'ANSWERED' }],
  ['app 1.0.7 (selectedOptionId)', { questionId: 'q21', selectedOptionId: '2', status: 'ANSWERED' }],
  ['legacy answerText', { questionId: 'q21', answerText: '2', status: 'ANSWERED' }],
  ['integerAnswer key', { questionId: 'q21', integerAnswer: 2, status: 'ANSWERED' }],
]) {
  test(`integer answer from ${label} is graded correct`, () => {
    const saved = normalizeAnswerPayload(body);
    assert.equal(saved.numericAnswer, '2');
    assert.ok(!saved.selectedOptionId);
    const graded = gradeAnswer(integerQ, saved);
    assert.deepEqual(graded, { attempted: true, isCorrect: true, marksObtained: 4 });
  });
}

test('wrong integer answer is attempted and loses negative marks', () => {
  assert.deepEqual(gradeAnswer(integerQ, { numericAnswer: '3' }), { attempted: true, isCorrect: false, marksObtained: -1 });
});

test('integer answer matches 2.00, HTML-wrapped and "Ans:" keys', () => {
  assert.equal(gradeAnswer({ ...integerQ, correctAnswerText: '<p>2.00</p>' }, { numericAnswer: '2' }).isCorrect, true);
  assert.equal(gradeAnswer({ ...integerQ, correctAnswerText: 'Ans: 2' }, { numericAnswer: '2.0' }).isCorrect, true);
  assert.equal(gradeAnswer({ ...integerQ, type: 'NUMERICAL', correctAnswerText: '1.5 to 1.6' }, { numericAnswer: '1.55' }).isCorrect, true);
});

test('integer question imported with placeholder options is still graded as typed', () => {
  const q = { ...integerQ, type: 'MCQ', options: [{ text: '' }, { text: '(B)' }, { text: '' }, { text: '' }] };
  assert.equal(isTypedAnswerQuestion(q), true);
  assert.equal(gradeAnswer(q, { numericAnswer: '2' }).isCorrect, true);
});

test('expected value can come from the option marked correct', () => {
  const q = { type: 'INTEGER', options: [{ _id: 'o1', text: '2', isCorrect: true }], correctAnswerText: '' };
  assert.equal(gradeAnswer(q, { numericAnswer: '2' }).isCorrect, true);
});

test('marked for review with no answer is skipped, not "Incorrect (0)" (6.1)', () => {
  const mcq = { type: 'MCQ', options: [{ _id: 'a', text: 'x', isCorrect: true }, { _id: 'b', text: 'y' }] };
  assert.deepEqual(gradeAnswer(mcq, { status: 'MARKED_FOR_REVIEW' }), { attempted: false, isCorrect: false, marksObtained: 0 });
  assert.deepEqual(gradeAnswer(integerQ, { status: 'MARKED_FOR_REVIEW', numericAnswer: '' }), { attempted: false, isCorrect: false, marksObtained: 0 });
});

test('MCQ and multiple-correct grading unchanged', () => {
  const mcq = { type: 'MCQ', options: [{ _id: 'a', text: 'x', isCorrect: true }, { _id: 'b', text: 'y' }] };
  assert.equal(gradeAnswer(mcq, { selectedOptionId: 'a' }).isCorrect, true);
  assert.equal(gradeAnswer(mcq, { selectedOptionId: 'b' }).marksObtained, -1);
  const multi = { type: 'MULTIPLE_CORRECT', options: [{ _id: 'a', isCorrect: true }, { _id: 'b', isCorrect: true }, { _id: 'c' }] };
  assert.equal(gradeAnswer(multi, { selectedOptionIds: ['b', 'a'] }).isCorrect, true);
  assert.equal(gradeAnswer(multi, { selectedOptionIds: ['a'] }).isCorrect, false);
});

test('a duplicate empty answer entry never hides the real answer', () => {
  const answers = [
    { questionId: 'q21', numericAnswer: '2', status: 'ANSWERED' },
    { questionId: 'q21', status: 'NOT_ANSWERED' },
  ];
  assert.equal(findStudentAnswer(answers, 'q21').numericAnswer, '2');
  assert.equal(findStudentAnswer(answers, 'other'), undefined);
});

test('a 12-digit typed answer is not mistaken for an option id', () => {
  assert.equal(normalizeAnswerPayload({ selectedOptionId: '123456789012' }).numericAnswer, '123456789012');
});

test('question image URL is added to the question HTML once', () => {
  const q = inlineQuestionImages({ questionText: 'Graph:', questionImageUrl: 'https://cdn.example.com/g.png' });
  assert.match(q.questionText, /<img src="https:\/\/cdn\.example\.com\/g\.png"/);
  const again = inlineQuestionImages({ ...q });
  assert.equal(again.questionText, q.questionText);
});

test('warning counters never go down when merged', () => {
  const { _mergeViolations } = require('./exam.controller');
  assert.deepEqual(_mergeViolations({ tabSwitches: 2, fullScreenExits: 0 }, { tabSwitches: 0 }).tabSwitches, 2);
  assert.equal(_mergeViolations({ tabSwitches: 1 }, { tabSwitches: 3 }).tabSwitches, 3);
  assert.equal(_mergeViolations(undefined, { tabSwitches: 1 }).tabSwitches, 1);
});
