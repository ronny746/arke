const test = require('node:test');
const assert = require('node:assert/strict');
const UserModel = require('./users.model');
const UserService = require('./users.service');

test('students and parents cannot list the institute\'s students/parents', async (t) => {
  const find = t.mock.method(UserModel, 'find', () => { throw new Error('should not query'); });
  assert.deepEqual(await UserService.getAllUsers({ role: 'student', userId: 'u1', instituteId: 'i1' }, { role: 'student' }), []);
  assert.deepEqual(await UserService.getAllUsers({ role: 'parent', userId: 'p1', instituteId: 'i1' }, {}), []);
  assert.equal(find.mock.callCount(), 0);
});

test('a student reading another user only gets a teacher public profile', async (t) => {
  let captured;
  t.mock.method(UserModel, 'findOne', (q) => {
    captured = q;
    const b = { select: (p) => { captured.projection = p; return b; }, populate: () => b, exec: async () => null };
    return b;
  });
  await UserService.getUserById('other', { role: 'student', userId: 'u1', instituteId: 'i1' });
  assert.equal(captured.role, 'teacher');
  assert.doesNotMatch(captured.projection, /email|phone|-password/);
});
