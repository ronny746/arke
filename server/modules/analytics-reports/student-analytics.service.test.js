const test = require('node:test');
const assert = require('node:assert/strict');

test('batch performance rejects a bad batch id with 400 (was a CastError 500)', async () => {
  const Analytics = require('./student-analytics.service');
  await assert.rejects(
    Analytics.getBatchPerformance({ batchId: 'undefined', instituteId: 'i1' }),
    (e) => e.statusCode === 400
  );
});
