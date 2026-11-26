const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../users/users.model');
const AuthController = require('./auth.controller');

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

test('master OTP for an unknown teacher phone returns 404 instead of crashing', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const res = mockRes();
  let nextErr;
  await AuthController.verifyOtp({ body: { phone: '9000000001', otp: '123456', role: 'teacher' } }, res, (e) => { nextErr = e; });
  assert.equal(nextErr, undefined, 'no exception reaches the error handler');
  assert.equal(res.statusCode, 404);
});

test('123456 does not sign a student in; only the OTP that was sent works', async (t) => {
  const OtpModel = require('../../models/otp.model');
  t.mock.method(User, 'findOne', async () => ({ _id: 'u1', role: 'student', phone: '9000000001', metadata: {} }));
  t.mock.method(OtpModel, 'findOne', async () => null); // no such OTP was sent
  const updates = t.mock.method(User, 'updateOne', async () => ({}));
  const res = mockRes();
  await AuthController.verifyOtp({ body: { phone: '9000000001', otp: '123456', role: 'student' } }, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Invalid or expired OTP/);
  assert.equal(updates.mock.callCount(), 0, 'no session was created');
});

test('123456 does not work for a student email OTP either', async (t) => {
  const OtpModel = require('../../models/otp.model');
  t.mock.method(User, 'findOne', async () => ({ _id: 'u1', role: 'student', email: 's@example.com' }));
  t.mock.method(OtpModel, 'findOne', async () => null);
  const res = mockRes();
  await AuthController.verifyEmailOtp({ body: { email: 's@example.com', otp: '123456', role: 'student' } }, res, () => {});
  assert.equal(res.statusCode, 401);
});

test('refresh issues a new 30-day token that keeps the same session', async () => {
  const jwt = require('jsonwebtoken');
  const env = require('../../config/env');
  const now = Math.floor(Date.now() / 1000);
  const req = {
    user: {
      userId: 'u1', role: 'student', instituteId: 'i1', branchId: null,
      sessionId: 's1', permissions: [], iat: now - 3600, exp: now + 60,
    },
  };
  const res = mockRes();
  let nextErr;
  await AuthController.refreshToken(req, res, (e) => { nextErr = e; });
  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET);
  assert.equal(decoded.userId, 'u1');
  assert.equal(decoded.sessionId, 's1', 'single-device session is kept');
  assert.ok(decoded.exp - decoded.iat >= 29 * 24 * 3600, 'lasts about 30 days');
});

test('developer-mode tokens cannot be refreshed', async () => {
  const res = mockRes();
  await AuthController.refreshToken({ user: { userId: 'u1', isDeveloper: true } }, res, () => {});
  assert.equal(res.statusCode, 403);
});
