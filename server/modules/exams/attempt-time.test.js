const test = require('node:test');
const assert = require('node:assert/strict');
const { secondsLeftFor } = require('./attempt-time');

const NOW = Date.parse('2026-11-28T06:00:00Z');

test('time left is start + duration, capped by window end, never negative', () => {
  const start = new Date(NOW - 20 * 60 * 1000);
  assert.equal(secondsLeftFor({ durationMinutes: 60 }, { startTime: start }, NOW), 40 * 60);
  assert.equal(secondsLeftFor({ durationMinutes: 60, endTime: new Date(NOW + 5 * 60 * 1000) }, { startTime: start }, NOW), 300);
  assert.equal(secondsLeftFor({ durationMinutes: 10 }, { startTime: start }, NOW), 0);
  assert.equal(secondsLeftFor({}, {}, NOW), null);
});
