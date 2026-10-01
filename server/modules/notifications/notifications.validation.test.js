const test = require('node:test');
const assert = require('node:assert/strict');
const { broadcastNotificationSchema, registerPushDeviceSchema } = require('./notifications.validation');

test('batch-family announcement requires a batch and accepts the supported audience', () => {
  const { error } = broadcastNotificationSchema.validate({
    audience: 'batch_families', batchId: '66a000000000000000000001', title: 'Holiday update', message: 'Tomorrow is a holiday.'
  });
  assert.equal(error, undefined);
});

test('individual announcements require the selected user id', () => {
  const { error } = broadcastNotificationSchema.validate({ audience: 'student', title: 'Reminder', message: 'Please check your timetable.' });
  assert.match(error.message, /userId/);
});

test('push device registration rejects malformed device tokens', () => {
  const { error } = registerPushDeviceSchema.validate({ token: 'short', platform: 'android' });
  assert.match(error.message, /length/);
});
