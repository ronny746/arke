const test = require('node:test');
const assert = require('node:assert/strict');
const { loggedInStudentFilter } = require('./leads.service');

test('logged-in lead filter only considers active students with a login signal', () => {
  const instituteId = '66a000000000000000000001';
  assert.deepEqual(loggedInStudentFilter(instituteId), {
    instituteId,
    role: 'student',
    isActive: true,
    $or: [
      { lastLoginAt: { $ne: null } },
      { activeSessionId: { $exists: true, $ne: null } }
    ]
  });
});
