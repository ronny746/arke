const test = require('node:test');
const assert = require('node:assert/strict');
const { getTopicFlag, normalizeThresholds, normalizeDob, makeWelcomeMessage } = require('./portal.rules');

test('flags use the agreed inclusive threshold boundaries', () => {
  assert.equal(getTopicFlag(0), 'RED');
  assert.equal(getTopicFlag(39.99), 'RED');
  assert.equal(getTopicFlag(40), 'YELLOW');
  assert.equal(getTopicFlag(70), 'YELLOW');
  assert.equal(getTopicFlag(70.01), 'GREEN');
  assert.equal(getTopicFlag(100), 'GREEN');
});

test('flag settings are editable but reject invalid ranges', () => {
  assert.deepEqual(normalizeThresholds({ redBelow: 35, yellowBelow: 75 }), { redBelow: 35, yellowBelow: 75 });
  assert.throws(() => normalizeThresholds({ redBelow: 70, yellowBelow: 70 }));
  assert.throws(() => normalizeThresholds({ redBelow: -1, yellowBelow: 70 }));
  assert.throws(() => getTopicFlag(101));
});

test('DOB login values are normalized without changing the date', () => {
  assert.equal(normalizeDob('2008-02-09T00:00:00.000Z'), '2008-02-09');
  assert.equal(normalizeDob('09/02/2008'), '2008-02-09');
  assert.throws(() => normalizeDob('not a date'));
});

test('welcome message includes paid, due and timetable information', () => {
  assert.equal(
    makeWelcomeMessage({ courseName: 'NEET 2027', batchName: 'Alpha', amountPaid: 5000, amountDue: 12000, timetableUrl: '/timetable' }),
    'Welcome to NEET 2027. You are enrolled in Alpha. Fee paid: ₹5000. Fee remaining: ₹7000. Your first-week timetable: /timetable'
  );
});
