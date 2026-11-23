const test = require('node:test');
const assert = require('node:assert/strict');
const BatchModel = require('./batches.model');
const CourseModel = require('../courses/courses.model');
const BatchService = require('./batches.service');

test('a student cannot join a paid course batch directly', async (t) => {
  const save = t.mock.fn(async () => {});
  t.mock.method(BatchModel, 'findOne', async () => ({ _id: 'b1', courseId: 'c1', students: [], save }));
  t.mock.method(CourseModel, 'findById', () => ({ select: async () => ({ fee: 4999 }) }));
  await assert.rejects(BatchService.joinBatch('b1', { role: 'student', userId: 'u1', instituteId: 'i1' }), (e) => e.statusCode === 403);
  assert.equal(save.mock.callCount(), 0);
});

test('batch rosters sent to students carry ids only', async (t) => {
  const populated = [];
  const q = { populate: (path, fields) => { populated.push([path, fields]); return q; }, then: (r) => r([]) };
  t.mock.method(BatchModel, 'find', () => q);
  await BatchService.getMyBatches({ role: 'student', userId: 'u1', instituteId: 'i1' });
  assert.deepEqual(populated.find(([p]) => p === 'students'), ['students', '_id']);
});
