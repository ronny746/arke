const test = require('node:test');
const assert = require('node:assert/strict');
const Resource = require('./resources.model');
const ResourcesService = require('./resources.service');

const student = { userId: 'u1', role: 'student', instituteId: 'i1' };

test('student cannot stream a resource outside their materials', async (t) => {
  t.mock.method(Resource, 'findOne', async () => ({ _id: 'r1', fileUrl: 'https://bucket.s3.amazonaws.com/a.pdf' }));
  t.mock.method(ResourcesService, 'getResources', async () => [{ _id: 'other' }]);
  await assert.rejects(ResourcesService.streamResourcePdf(student, 'r1'), (e) => e.statusCode === 403);
});

test('?url= is not an open proxy for students', async (t) => {
  t.mock.method(Resource, 'findOne', async () => null);
  await assert.rejects(
    ResourcesService.streamResourcePdf(student, undefined, 'http://169.254.169.254/latest/meta-data/'),
    (e) => e.statusCode === 403
  );
});

test('non-http targets are refused even for staff', async () => {
  await assert.rejects(
    ResourcesService.streamResourcePdf({ role: 'admin', instituteId: 'i1' }, undefined, 'file:///etc/passwd'),
    (e) => e.statusCode === 400
  );
});

test('parents only get resources of their children\'s batches', async (t) => {
  const UserModel = require('../users/users.model');
  const BatchModel = require('../batches/batches.model');
  t.mock.method(UserModel, 'findById', () => ({ select: () => ({ lean: async () => ({ childrenIds: ['kid1'] }) }) }));
  let batchQuery;
  t.mock.method(BatchModel, 'find', async (q) => { batchQuery = q; return [{ _id: 'b1', courseId: 'c1' }]; });
  let resourceQuery;
  const chain = { populate: () => chain, sort: async () => [] };
  t.mock.method(Resource, 'find', (q) => { resourceQuery = q; return chain; });
  await ResourcesService.getResources({ role: 'parent', userId: 'p1', instituteId: 'i1' });
  assert.deepEqual(batchQuery, { students: { $in: ['kid1'] } });
  assert.deepEqual(resourceQuery.isActive, { $ne: false });
  assert.ok(Array.isArray(resourceQuery.$or), 'parent query is batch-scoped, not the admin view');
});
