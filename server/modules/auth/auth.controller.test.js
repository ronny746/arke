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

test('master OTP for an unknown phone returns 404 instead of crashing', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const res = mockRes();
  let nextErr;
  await AuthController.verifyOtp({ body: { phone: '9000000001', otp: '123456', role: 'student' } }, res, (e) => { nextErr = e; });
  assert.equal(nextErr, undefined, 'no exception reaches the error handler');
  assert.equal(res.statusCode, 404);
});
