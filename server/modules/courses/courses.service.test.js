const test = require('node:test');
const assert = require('node:assert/strict');
const CourseModel = require('./courses.model');
const CourseService = require('./courses.service');

const chain = (result, capture) => {
  const q = {
    populate: () => q,
    sort: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return q;
};

test('free-enroll endpoint refuses paid courses (C1)', async (t) => {
  t.mock.method(CourseModel, 'findById', async () => ({ _id: 'c1', fee: 4999, isActive: true }));
  await assert.rejects(
    CourseService.enrollCourse('c1', { userId: 'u1', role: 'student' }, {}),
    (err) => err.statusCode === 400 && /paid course/i.test(err.message)
  );
});

test('free-enroll endpoint refuses inactive / unpublished courses', async (t) => {
  t.mock.method(CourseModel, 'findById', async () => ({ _id: 'c1', fee: 0, isActive: false }));
  await assert.rejects(CourseService.enrollCourse('c1', { userId: 'u1' }, {}), /not open/);
});

test('students and parents only see live courses (C6)', async (t) => {
  const queries = [];
  t.mock.method(CourseModel, 'find', (q) => { queries.push(q); return chain([]); });
  t.mock.method(CourseModel, 'findOne', (q) => { queries.push(q); return chain(null); });

  await CourseService.getCourses({ role: 'student', instituteId: 'i1' }, { targetExam: 'NEET' });
  const live = queries[0].$and[0];
  assert.equal(live.isActive, true);
  assert.deepEqual(live.isPublished, { $ne: false });
  assert.ok(live.$or.some((c) => c.endDate && c.endDate.$gt instanceof Date));
  assert.ok(Array.isArray(queries[0].$or), 'targetExam filter is kept separately');

  await CourseService.getCourseById('c1', { role: 'parent', instituteId: 'i1' });
  assert.equal(queries[1].isActive, true);
  assert.equal(queries[1]._id, 'c1');

  await CourseService.getCourses({ role: 'admin', instituteId: 'i1' });
  assert.equal(queries[2].$and, undefined, 'admins still see every course');
});

test('enrolling twice in a free course creates no duplicate fee record', async (t) => {
  const UserModel = require('../users/users.model');
  const { FeeRecord } = require('../fees-payments/fees-payments.model');
  t.mock.method(CourseModel, 'findById', async () => ({ _id: 'c1', fee: 0, isActive: true }));
  t.mock.method(UserModel, 'findById', async () => ({
    firstName: 'A', lastName: 'B', phone: '9876543210', email: 'a@b.in', role: 'student', metadata: { rollNo: 'RK1' }
  }));
  t.mock.method(FeeRecord, 'exists', async () => ({ _id: 'f1' }));
  const save = t.mock.method(FeeRecord.prototype, 'save', async () => {});
  const result = await CourseService.enrollCourse('c1', { userId: 'u1', role: 'student' }, {});
  assert.equal(result.alreadyEnrolled, true);
  assert.equal(save.mock.callCount(), 0);
});
