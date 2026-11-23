const test = require('node:test');
const assert = require('node:assert/strict');
const { getAttemptDeadline } = require('./exam.controller');

const GRACE = 2 * 60 * 1000;

test('attempt deadline is start + duration + grace (E10)', () => {
  const start = new Date('2026-11-23T10:00:00Z');
  const deadline = getAttemptDeadline(
    { durationMinutes: 60, endTime: new Date('2026-11-23T20:00:00Z') },
    { startTime: start }
  );
  assert.equal(deadline, start.getTime() + 60 * 60 * 1000 + GRACE);
});

test('attempt deadline never passes the exam window end (E10)', () => {
  const end = new Date('2026-11-23T10:30:00Z');
  const deadline = getAttemptDeadline(
    { durationMinutes: 60, endTime: end },
    { startTime: new Date('2026-11-23T10:00:00Z') }
  );
  assert.equal(deadline, end.getTime() + GRACE);
});

test('no timing configured means no server deadline', () => {
  assert.equal(getAttemptDeadline({}, {}), Infinity);
});

const { normalizeAnswerPayload } = require('./exam.controller');

test('integer typed into selectedOptionId (app 1.0.7) is saved as numericAnswer', () => {
  const out = normalizeAnswerPayload({ questionId: 'q', selectedOptionId: '4' });
  assert.equal(out.numericAnswer, '4');
  assert.ok(!('selectedOptionId' in out));
});

test('real option ids and new-app payloads are left alone', () => {
  const id = '66a000000000000000000001';
  assert.equal(normalizeAnswerPayload({ selectedOptionId: id }).selectedOptionId, id);
  assert.equal(normalizeAnswerPayload({ numericAnswer: 5 }).numericAnswer, '5');
  assert.deepEqual(normalizeAnswerPayload({ selectedOptionIds: [id, 'x'] }).selectedOptionIds, [id]);
  assert.equal(normalizeAnswerPayload({ answerText: '12' }).numericAnswer, '12');
  assert.equal(normalizeAnswerPayload({ answerText: 'abc' }).subjectiveAnswerText, 'abc');
});

const { getAttemptSeconds, resultsLockedUntil } = require('./exam.controller');

test('analysis totalTime comes from the attempt start/end (was always 0)', () => {
  assert.equal(getAttemptSeconds({ startTime: '2026-11-23T10:00:00Z', endTime: '2026-11-23T10:42:30Z' }), 2550);
  assert.equal(getAttemptSeconds({ totalTimeTaken: 99 }), 99);
  assert.equal(getAttemptSeconds({}), 0);
});

test('results stay hidden until the window ends only when the exam says so', () => {
  const future = new Date(Date.now() + 3600e3);
  assert.equal(resultsLockedUntil({ settings: { showResultsAfterSubmit: true, endTime: future } }), null);
  assert.equal(resultsLockedUntil({ settings: { endTime: future } }), null, 'default stays open');
  assert.equal(resultsLockedUntil({ settings: { showResultsAfterSubmit: false, endTime: new Date(Date.now() - 1000) } }), null);
  assert.ok(resultsLockedUntil({ settings: { showResultsAfterSubmit: false, endTime: future } }) instanceof Date);
});
