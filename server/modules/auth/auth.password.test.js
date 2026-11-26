const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../users/users.model');
const OtpModel = require('../../models/otp.model');
const SystemConfig = require('../system-config/system-config.model');
const AuthService = require('./auth.service');

const configWith = (on) => () => ({
  select: () => ({ lean: async () => ({ authSettings: { enableStudentPasswordLogin: on } }) }),
});

const student = (extra = {}) => ({
  _id: 'u1',
  role: 'student',
  phone: '9876501234',
  metadata: { rollNo: 'RK657' },
  ...extra,
});

test('student password login is refused while the admin setting is off', async (t) => {
  t.mock.method(SystemConfig, 'findOne', configWith(false));
  t.mock.method(User, 'findOne', () => ({
    select: () => ({ populate: async () => ({ ...student(), comparePassword: async () => true }) }),
  }));
  await assert.rejects(AuthService.login('RK657', 'secret1', 'student'), (e) => e.status === 403);
});

test('a password the student set works as typed; old DOB passwords still work', () => {
  assert.deepEqual(AuthService._passwordCandidatesFor('student', 'mypass1'), ['mypass1']);
  assert.ok(AuthService._passwordCandidatesFor('student', '01/05/2008').includes('2008-05-01'));
  assert.deepEqual(AuthService._passwordCandidatesFor('teacher', '01/05/2008'), ['01/05/2008']);
});

test('roll number lookup ignores case and does not treat a roll number as a phone', async (t) => {
  let query;
  t.mock.method(User, 'findOne', async (q) => { query = q; return student(); });
  await AuthService._findStudentByIdentifier('rk657');
  assert.equal(query.role, 'student');
  assert.ok(query.$or[0]['metadata.rollNo'].test('RK657'));
  assert.equal(query.$or.length, 1, 'no phone clause for a roll number');
  await AuthService._findStudentByIdentifier('98765 01234');
  assert.deepEqual(query.$or[1].phone.$in, ['9876501234', '+919876501234']);
});

test('forgot password: wrong OTP counts attempts, the right one sets the password and signs out other devices', async (t) => {
  t.mock.method(SystemConfig, 'findOne', configWith(true));
  t.mock.method(User, 'findOne', async () => student());
  const record = {
    otp: '424242', attempts: 0,
    save: async () => {}, deleteOne: async () => {},
  };
  t.mock.method(OtpModel, 'findOne', () => ({ sort: async () => record }));
  t.mock.method(OtpModel, 'deleteMany', async () => ({}));
  const saved = {};
  t.mock.method(User, 'findById', () => ({
    select: async () => ({ save: async function () { Object.assign(saved, this); } }),
  }));

  await assert.rejects(AuthService.resetPassword('RK657', '111111', 'newpass1'), /Wrong OTP/);
  assert.equal(record.attempts, 1);

  await assert.rejects(AuthService.resetPassword('RK657', '424242', '123'), /at least 6/);

  const out = await AuthService.resetPassword('RK657', '424242', 'newpass1');
  assert.equal(out.rollNo, 'RK657');
  assert.equal(saved.password, 'newpass1');
  assert.equal(saved.activeSessionId, null);
});

test('forgot password request is refused while the setting is off and rate-limited when on', async (t) => {
  t.mock.method(SystemConfig, 'findOne', configWith(false));
  await assert.rejects(AuthService.requestPasswordReset('RK657'), (e) => e.status === 403);

  t.mock.method(SystemConfig, 'findOne', configWith(true));
  t.mock.method(User, 'findOne', async () => student());
  t.mock.method(OtpModel, 'findOne', () => ({ sort: () => ({ lean: async () => ({ createdAt: new Date() }) }) }));
  await assert.rejects(AuthService.requestPasswordReset('RK657'), (e) => e.status === 429);
});
