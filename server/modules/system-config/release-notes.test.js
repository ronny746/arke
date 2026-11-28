const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeReleaseNotes } = require('./release-notes');

test('newest version first, empty notes dropped, duplicates removed', () => {
  const out = normalizeReleaseNotes([
    { version: '1.0.9', notes: ['Old fix'] },
    { version: '1.0.11', date: '2026-11-28', notes: ['Next test card', '  ', 'Resume after crash'] },
    { version: '1.0.10', notes: [] },
    { version: '1.0.11', notes: ['dup'] },
    { version: ' ', notes: ['no version'] },
  ]);
  assert.deepEqual(out.map((e) => e.version), ['1.0.11', '1.0.9']);
  assert.deepEqual(out[0].notes, ['Next test card', 'Resume after crash']);
  assert.equal(out[0].date.toISOString(), '2026-11-28T00:00:00.000Z');
  assert.equal(out[1].date, null);
  assert.deepEqual(normalizeReleaseNotes(null), []);
});
