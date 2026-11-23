const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSelfProfileUpdate } = require('./users.controller');

test('self profile update only sets whitelisted fields (H6)', () => {
  const { $set } = buildSelfProfileUpdate({
    firstName: ' Asha ', lastName: 'K', phone: '9876543210', email: '  ',
    role: 'admin', isActive: false, childrenIds: ['x'], parentId: 'p', instituteId: 'i2', password: 'x',
    permissions: ['all']
  });
  assert.equal($set.firstName, 'Asha');
  assert.equal($set.phone, '9876543210');
  assert.ok(!('email' in $set), 'empty email is not stored');
  for (const key of ['role', 'isActive', 'childrenIds', 'parentId', 'instituteId', 'password', 'permissions']) {
    assert.ok(!(key in $set), `${key} must be ignored`);
  }
});

test('metadata is merged with dotted paths and admin keys are protected (H6)', () => {
  const { $set } = buildSelfProfileUpdate({
    metadata: { studentClass: 'Class 12', rollNo: 'HACK', section: 'Z', session: 'x', '$where': 1, 'a.b': 1, email: '' }
  });
  assert.equal($set['metadata.studentClass'], 'Class 12');
  assert.equal($set['metadata.isProfileIncomplete'], false);
  assert.ok(!('metadata' in $set), 'metadata object is never replaced wholesale');
  for (const key of ['metadata.rollNo', 'metadata.section', 'metadata.session', 'metadata.$where', 'metadata.a.b', 'metadata.email']) {
    assert.ok(!(key in $set), `${key} must be ignored`);
  }
});
