const test = require('node:test');
const assert = require('node:assert/strict');
const { FeeRecord } = require('../fees-payments/fees-payments.model');
const BatchModel = require('../batches/batches.model');
const { assertCoursePurchasable } = require('./payments.service');

const course = { _id: 'c1', isActive: true, isPublished: true };

test('payment is refused for inactive or unpublished courses (C2)', async () => {
  await assert.rejects(assertCoursePurchasable({ ...course, isActive: false }, 'u1', false), /not open/);
  await assert.rejects(assertCoursePurchasable({ ...course, isPublished: false }, 'u1', false), /not open/);
});

test('payment is refused when the course is already paid (C2)', async (t) => {
  t.mock.method(FeeRecord, 'exists', async (q) => (q.status === 'PAID' ? { _id: 'f1' } : null));
  t.mock.method(BatchModel, 'exists', async () => null);
  await assert.rejects(assertCoursePurchasable(course, 'u1', false), /already enrolled/);
});

test('payment is refused when already in the course batch with nothing due (C2)', async (t) => {
  t.mock.method(FeeRecord, 'exists', async () => null);
  t.mock.method(BatchModel, 'exists', async () => ({ _id: 'b1' }));
  await assert.rejects(assertCoursePurchasable(course, 'u1', false), /already enrolled/);
});

test('first purchase and pending installments are still allowed', async (t) => {
  t.mock.method(FeeRecord, 'exists', async () => null);
  t.mock.method(BatchModel, 'exists', async () => null);
  await assertCoursePurchasable(course, 'u1', false);
  await assertCoursePurchasable(course, 'u1', true);
});

const { PaymentTransaction } = require('../fees-payments/fees-payments.model');
const razorpayService = require('./razorpay.service');
const paymentsService = require('./payments.service');
const sig = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 's' };

test('Razorpay verify refuses an order this server did not create', async (t) => {
  t.mock.method(razorpayService, 'verifySignature', () => true);
  t.mock.method(PaymentTransaction, 'findOne', async () => null);
  await assert.rejects(paymentsService.verifyRazorpayPayment({ ...sig, courseId: 'expensive' }), /not found/);
});

test('Razorpay verify cannot be pointed at another course', async (t) => {
  t.mock.method(razorpayService, 'verifySignature', () => true);
  t.mock.method(PaymentTransaction, 'findOne', async () => ({
    paymentMethod: 'RAZORPAY', status: 'PENDING', courseId: 'cheap', studentId: 'u1', save: async () => {}
  }));
  const fulfil = t.mock.method(paymentsService, 'fulfillCourseEnrollment', async () => {});
  await assert.rejects(paymentsService.verifyRazorpayPayment({ ...sig, courseId: 'expensive' }), /does not match/);
  assert.equal(fulfil.mock.callCount(), 0);
});

test('Razorpay verify replay does not enroll/credit twice', async (t) => {
  t.mock.method(razorpayService, 'verifySignature', () => true);
  t.mock.method(PaymentTransaction, 'findOne', async () => ({
    paymentMethod: 'RAZORPAY', status: 'SUCCESS', courseId: 'c1', studentId: 'u1', save: async () => {}
  }));
  const fulfil = t.mock.method(paymentsService, 'fulfillCourseEnrollment', async () => {});
  const res = await paymentsService.verifyRazorpayPayment({ ...sig, courseId: 'c1' });
  assert.equal(res.alreadyVerified, true);
  assert.equal(fulfil.mock.callCount(), 0);
});

test('Razorpay verify fulfils the stored course once', async (t) => {
  t.mock.method(razorpayService, 'verifySignature', () => true);
  t.mock.method(PaymentTransaction, 'findOne', async () => ({
    paymentMethod: 'RAZORPAY', status: 'PENDING', courseId: 'c1', studentId: 'u1', save: async () => {}
  }));
  const fulfil = t.mock.method(paymentsService, 'fulfillCourseEnrollment', async () => {});
  await paymentsService.verifyRazorpayPayment({ ...sig });
  assert.equal(fulfil.mock.callCount(), 1);
  assert.equal(fulfil.mock.calls[0].arguments[0], 'c1');
});
