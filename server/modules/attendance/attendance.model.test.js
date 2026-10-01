const test = require('node:test');
const assert = require('node:assert/strict');
const Attendance = require('./attendance.model');

test('attendance uses a dedicated unique index for each live-class session', () => {
  const indexes = Attendance.schema.indexes();
  const sessionIndex = indexes.find(([keys]) => keys.liveClassId === 1 && keys.instituteId === 1);

  assert.ok(sessionIndex);
  assert.equal(sessionIndex[1].unique, true);
  assert.ok(
    indexes.some(([keys]) =>
      keys.instituteId === 1 &&
      keys.batchId === 1 &&
      keys.subjectId === 1 &&
      keys.date === 1 &&
      keys.liveClassId === 1
    )
  );
});
