const test = require('node:test');
const assert = require('node:assert/strict');

test('batch performance rejects a bad batch id with 400 (was a CastError 500)', async () => {
  const Analytics = require('./student-analytics.service');
  await assert.rejects(
    Analytics.getBatchPerformance({ batchId: 'undefined', instituteId: 'i1' }),
    (e) => e.statusCode === 400
  );
});

test('subject names are merged regardless of case', () => {
  const { _canonicalSubjectName } = require('./student-analytics.service');
  assert.equal(_canonicalSubjectName('PHYSICS'), 'Physics');
  assert.equal(_canonicalSubjectName(' physics '), 'Physics');
  assert.equal(_canonicalSubjectName('Maths'), 'Mathematics');
  assert.equal(_canonicalSubjectName('ORGANIC CHEMISTRY'), 'Organic Chemistry');
  assert.equal(_canonicalSubjectName(''), '');
});
