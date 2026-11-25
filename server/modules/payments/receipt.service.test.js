const test = require('node:test');
const assert = require('node:assert/strict');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');
const InstituteModel = require('../institutes/institutes.model');
const UserModel = require('../users/users.model');
const receipt = require('./receipt.service');

const TXN_ID = '6650aa11bb22cc33dd44ee55';
const STUDENT_ID = '6650aa11bb22cc33dd440001';
const OTHER_ID = '6650aa11bb22cc33dd440002';
const PARENT_ID = '6650aa11bb22cc33dd440003';
const INSTITUTE_ID = '6650aa11bb22cc33dd440009';

// Mongoose query stand-in: populate()/select() chain, lean() resolves.
const query = (value) => {
  const q = { populate: () => q, select: () => q, lean: async () => value };
  return q;
};

const paidTxn = (overrides = {}) => ({
  _id: TXN_ID,
  instituteId: INSTITUTE_ID,
  studentId: { _id: STUDENT_ID, firstName: 'Rohit', lastName: '2', phone: '9999999999', email: 'rohit@example.com', parentId: PARENT_ID },
  courseId: { _id: 'c1', name: 'JEE Advanced 2027 Complete Two-Year Program with Test Series and Study Material', fee: 4999 },
  batchId: { name: 'Lakshya', section: 'A' },
  amountPaid: 4999,
  paymentMethod: 'RAZORPAY',
  transactionId: 'order_ABC123',
  easepayid: 'pay_XYZ789',
  status: 'SUCCESS',
  createdAt: new Date('2026-11-20T10:00:00Z'),
  updatedAt: new Date('2026-11-20T10:01:00Z'),
  ...overrides
});

const mockLookup = (t, txn, feeRecord = null) => {
  t.mock.method(PaymentTransaction, 'findById', () => query(txn));
  t.mock.method(FeeRecord, 'findById', () => query(feeRecord));
  t.mock.method(InstituteModel, 'findById', () => query({ name: 'ARKE Scholars', contactEmail: 'help@arke.test' }));
};

test('only the paying student, their parent or the institute admin may access a receipt', () => {
  const student = { _id: STUDENT_ID, parentId: PARENT_ID };
  const ctx = { student, instituteId: INSTITUTE_ID };
  assert.equal(receipt.canAccessReceipt({ role: 'student', userId: STUDENT_ID }, ctx), true);
  assert.equal(receipt.canAccessReceipt({ role: 'student', userId: OTHER_ID }, ctx), false);
  assert.equal(receipt.canAccessReceipt({ role: 'parent', userId: PARENT_ID }, ctx), true);
  assert.equal(receipt.canAccessReceipt({ role: 'parent', userId: OTHER_ID, childrenIds: [STUDENT_ID] }, ctx), true);
  assert.equal(receipt.canAccessReceipt({ role: 'parent', userId: OTHER_ID, childrenIds: [] }, ctx), false);
  assert.equal(receipt.canAccessReceipt({ role: 'admin', userId: OTHER_ID, instituteId: INSTITUTE_ID }, ctx), true);
  assert.equal(receipt.canAccessReceipt({ role: 'admin', userId: OTHER_ID, instituteId: 'another-inst' }, ctx), false);
  assert.equal(receipt.canAccessReceipt({ role: 'teacher', userId: OTHER_ID, instituteId: INSTITUTE_ID }, ctx), false);
});

test('paying student gets receipt data with Razorpay ids and amounts', async (t) => {
  mockLookup(t, paidTxn());
  const data = await receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, TXN_ID);
  assert.equal(data.status, 'PAID');
  assert.match(data.receiptNo, /^ARK-20261120-44EE55$/);
  assert.equal(data.amounts.total, 4999);
  assert.equal(data.student.name, 'Rohit 2');
  assert.deepEqual(data.references, [['Razorpay Order ID', 'order_ABC123'], ['Razorpay Payment ID', 'pay_XYZ789']]);
  assert.ok(data.item.details.includes('Batch: Lakshya (Sec A)'));
});

test('another student is refused with 403', async (t) => {
  mockLookup(t, paidTxn());
  await assert.rejects(
    receipt.loadReceiptData({ role: 'student', userId: OTHER_ID }, TXN_ID),
    (err) => err.statusCode === 403
  );
});

test('parent access is checked against the parent record when the token has no children', async (t) => {
  mockLookup(t, paidTxn({ studentId: { _id: STUDENT_ID, firstName: 'Rohit' } }));
  t.mock.method(UserModel, 'findById', () => query({ childrenIds: [STUDENT_ID] }));
  const data = await receipt.loadReceiptData({ role: 'parent', userId: PARENT_ID }, TXN_ID);
  assert.equal(data.amounts.total, 4999);
});

test('pending and failed payments have no receipt', async (t) => {
  for (const status of ['PENDING', 'FAILED']) {
    mockLookup(t, paidTxn({ status }));
    await assert.rejects(
      receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, TXN_ID),
      (err) => err.statusCode === 409
    );
    t.mock.restoreAll();
  }
});

test('unknown or malformed ids return 404', async (t) => {
  mockLookup(t, null, null);
  await assert.rejects(receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, TXN_ID), (err) => err.statusCode === 404);
  await assert.rejects(receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, 'not-an-id'), (err) => err.statusCode === 404);
});

test('a fully paid fee record (list fallback) also gets a receipt', async (t) => {
  mockLookup(t, null, {
    _id: TXN_ID, instituteId: INSTITUTE_ID, studentId: { _id: STUDENT_ID, firstName: 'Rohit' },
    feeType: 'TUITION', amountDue: 0, amountPaid: 12000, status: 'PAID', updatedAt: new Date('2026-11-21T05:00:00Z')
  });
  const data = await receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, TXN_ID);
  assert.equal(data.item.title, 'Tuition Fee');
  assert.equal(data.amounts.total, 12000);
});

test('renders a one-page A4 PDF', async (t) => {
  mockLookup(t, paidTxn());
  const data = await receipt.loadReceiptData({ role: 'student', userId: STUDENT_ID }, TXN_ID);
  const pdf = await receipt.renderReceiptPdf(data);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const text = pdf.toString('latin1');
  assert.equal((text.match(/\/Type \/Page\b/g) || []).length, 1);
  assert.match(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
});

test('amount in words uses the Indian numbering system', () => {
  assert.equal(receipt.amountInWords(4999), 'Rupees Four Thousand Nine Hundred Ninety Nine Only');
  assert.equal(receipt.amountInWords(125000.5), 'Rupees One Lakh Twenty Five Thousand and Fifty Paise Only');
  assert.equal(receipt.amountInWords(0), 'Rupees Zero Only');
});

test('GET /payments/:id/receipt.pdf sends the PDF as a download, or a JSON error', async (t) => {
  const controller = require('./payments.controller');
  const fakeRes = () => {
    const res = { headers: {}, statusCode: 200 };
    res.set = (h) => { Object.assign(res.headers, h); return res; };
    res.status = (c) => { res.statusCode = c; return res; };
    res.send = (b) => { res.body = b; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
  };

  mockLookup(t, paidTxn());
  const ok = fakeRes();
  await controller.downloadReceipt({ user: { role: 'student', userId: STUDENT_ID }, params: { id: TXN_ID }, query: {} }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['Content-Type'], 'application/pdf');
  assert.match(ok.headers['Content-Disposition'], /^attachment; filename="ARKE-Receipt-ARK-20261120-44EE55\.pdf"$/);

  const denied = fakeRes();
  await controller.downloadReceipt({ user: { role: 'student', userId: OTHER_ID }, params: { id: TXN_ID }, query: {} }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.success, false);
});
