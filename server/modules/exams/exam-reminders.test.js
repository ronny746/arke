const test = require('node:test');
const assert = require('node:assert/strict');
const { reminderSchedule, dueReminder, reminderText } = require('./exam-reminders');

const at = (iso) => Date.parse(iso);
// Sunday 30 Nov 2026, 09:00 IST = 03:30 UTC
const START = '2026-11-30T03:30:00Z';
const mock = (extra = {}) => ({ title: 'All India Mock 3', settings: { startTime: new Date(START) }, ...extra });

test('evening = 19:00 IST day before, morning = 07:00 IST', () => {
  const s = reminderSchedule(START);
  assert.equal(new Date(s.eveningAt).toISOString(), '2026-11-29T13:30:00.000Z');
  assert.equal(new Date(s.morningAt).toISOString(), '2026-11-30T01:30:00.000Z');
});

test('early start: morning reminder 1 hour before', () => {
  const s = reminderSchedule('2026-11-30T00:30:00Z'); // 06:00 IST
  assert.equal(new Date(s.morningAt).toISOString(), '2026-11-29T23:30:00.000Z');
});

test('due reminders through the day', () => {
  assert.equal(dueReminder(mock(), at('2026-11-29T12:00:00Z')), null);
  assert.equal(dueReminder(mock(), at('2026-11-29T13:31:00Z')), 'EVENING');
  const eveningSent = mock({ reminders: { startTime: new Date(START), eveningSentAt: new Date() } });
  assert.equal(dueReminder(eveningSent, at('2026-11-29T15:00:00Z')), null);
  assert.equal(dueReminder(eveningSent, at('2026-11-30T01:31:00Z')), 'MORNING');
  const bothSent = mock({ reminders: { startTime: new Date(START), eveningSentAt: new Date(), morningSentAt: new Date() } });
  assert.equal(dueReminder(bothSent, at('2026-11-30T02:00:00Z')), null);
  assert.equal(dueReminder(mock(), at('2026-11-30T04:00:00Z')), null, 'after start');
});

test('late-created test gets only the morning reminder', () => {
  assert.equal(dueReminder(mock(), at('2026-11-30T02:00:00Z')), 'MORNING');
});

test('a moved test sends its reminders again', () => {
  const oldSent = mock({ reminders: { startTime: new Date('2026-11-23T03:30:00Z'), eveningSentAt: new Date(), morningSentAt: new Date() } });
  assert.equal(dueReminder(oldSent, at('2026-11-29T14:00:00Z')), 'EVENING');
});

test('only part tests and full mocks', () => {
  assert.equal(dueReminder({ ...mock(), title: 'Chapter Test: Limits' }, at('2026-11-29T14:00:00Z')), null);
  assert.equal(dueReminder({ ...mock(), title: 'Shakti Part Test 2' }, at('2026-11-29T14:00:00Z')), 'EVENING');
});

test('reminder text has the IST time', () => {
  const t = reminderText(mock(), 'EVENING');
  assert.match(t.title, /^Full mock tomorrow: All India Mock 3$/);
  assert.match(t.message, /9:00\s?am/i);
});
