const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMentorWindow } = require('./operations.service');

test('mentor sessions accept exactly thirty minutes', () => {
  const result = validateMentorWindow({ startAt: '2026-10-01T10:00:00.000Z', endAt: '2026-10-01T10:30:00.000Z' });
  assert.equal(result.endAt.getTime() - result.startAt.getTime(), 30 * 60 * 1000);
});

test('mentor sessions reject a duration other than thirty minutes', () => {
  assert.throws(
    () => validateMentorWindow({ startAt: '2026-10-01T10:00:00.000Z', endAt: '2026-10-01T10:45:00.000Z' }),
    /exactly 30 minutes/
  );
});

test('mentor sessions reject invalid date values', () => {
  assert.throws(
    () => validateMentorWindow({ startAt: 'not-a-date', endAt: '2026-10-01T10:30:00.000Z' }),
    /valid mentor session/
  );
});
