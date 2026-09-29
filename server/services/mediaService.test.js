const test = require('node:test');
const assert = require('node:assert/strict');
const mediaService = require('./mediaService');

test('only the producer owner can pause or resume a camera producer', async () => {
  let pauses = 0;
  let resumes = 0;
  mediaService.rooms.set('CAMERA-ROOM', {
    peers: new Map([
      ['teacher', { producers: ['camera-producer'] }],
      ['student', { producers: [] }],
    ]),
    producers: new Map([[
      'camera-producer',
      { pause: async () => { pauses += 1; }, resume: async () => { resumes += 1; } },
    ]]),
  });

  await assert.rejects(
    () => mediaService.pauseProducer('CAMERA-ROOM', 'student', 'camera-producer'),
    /does not belong/,
  );
  await mediaService.pauseProducer('CAMERA-ROOM', 'teacher', 'camera-producer');
  await mediaService.resumeProducer('CAMERA-ROOM', 'teacher', 'camera-producer');

  assert.equal(pauses, 1);
  assert.equal(resumes, 1);
  mediaService.rooms.delete('CAMERA-ROOM');
});
