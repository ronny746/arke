const test = require('node:test');
const assert = require('node:assert/strict');
const { AppShareService } = require('./appShareService');

test('pairs an app only with the matching active room and code', () => {
  const service = new AppShareService();
  const session = service.create('bio-101', 'teacher-socket');

  assert.equal(service.join({ roomCode: 'BIO-101', code: 'WRONG1', appSocketId: 'app-a' }), null);
  assert.equal(service.join({ roomCode: 'MATH-101', code: session.code, appSocketId: 'app-a' }), null);

  const paired = service.join({ roomCode: 'bio-101', code: session.code, appSocketId: 'app-a' });
  assert.equal(paired.id, session.id);
  assert.equal(service.getBySocket('app-a').roomCode, 'BIO-101');
  assert.equal(service.join({ roomCode: 'bio-101', code: session.code, appSocketId: 'app-b' }), null);
});

test('expires unused pairing codes and bounds stroke history', () => {
  let now = 10;
  const service = new AppShareService({ now: () => now, ttlMs: 100 });
  const session = service.create('room', 'teacher');
  now = 111;
  assert.equal(service.join({ roomCode: 'room', code: session.code, appSocketId: 'app' }), null);

  now = 20;
  const active = service.create('room', 'teacher');
  for (let i = 0; i < 1201; i += 1) service.appendStroke(active.id, { id: i });
  assert.equal(service.sessions.get(active.id).strokes.length, 1001);
});
