const test = require('node:test');
const assert = require('node:assert/strict');
const { pickNextTest } = require('./next-test');

const NOW = Date.parse('2026-11-28T06:00:00Z'); // 11:30 IST
const H = 3600 * 1000;
const exam = (id, title, startOffsetH, endOffsetH) => ({
  _id: id, title, settings: { startTime: new Date(NOW + startOffsetH * H), endTime: new Date(NOW + endOffsetH * H) },
});

test('in-progress attempt comes first', () => {
  const r = pickNextTest(
    [exam('a', 'Full Mock 1', 2, 5), exam('b', 'Chapter Test: Limits', -100, 1000)],
    new Map([['b', 'IN_PROGRESS']]), NOW,
  );
  assert.deepEqual([r.exam._id, r.reason], ['b', 'IN_PROGRESS']);
});

test('a live scheduled sitting beats an upcoming one; long practice windows are ignored', () => {
  const r = pickNextTest([
    exam('practice', 'Chapter Test: Limits', -500, 2000),
    exam('live', 'Part Test 2', -1, 2),
    exam('next', 'Full Mock 3', 20, 23),
  ], new Map(), NOW);
  assert.deepEqual([r.exam._id, r.reason], ['live', 'LIVE']);
});

test('upcoming: earliest day; on the same IST day a part test / mock is preferred', () => {
  const r = pickNextTest([
    exam('chap', 'Chapter Test: Vectors', 24, 26),
    exam('mock', 'All India Mock 2', 27, 30),
    exam('later', 'Part Test 4', 72, 75),
  ], new Map(), NOW);
  assert.deepEqual([r.exam._id, r.reason], ['mock', 'UPCOMING']);
});

test('submitted and ended tests are skipped; nothing left gives null', () => {
  assert.equal(pickNextTest([
    exam('done', 'Full Mock 1', 2, 5),
    exam('ended', 'Part Test 1', -10, -1),
    exam('practice', 'Chapter Test', -500, 2000),
  ], new Map([['done', 'SUBMITTED']]), NOW), null);
});

test('an open attempt whose time ran out is not offered', () => {
  const r = pickNextTest(
    [exam('old', 'Chapter Test: Atoms', -100, 1000), exam('mock', 'Full Mock 2', 5, 8)],
    new Map([['old', 'EXPIRED']]), NOW,
  );
  assert.deepEqual([r.exam._id, r.reason], ['mock', 'UPCOMING']);
});
