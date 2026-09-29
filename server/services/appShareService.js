const crypto = require('crypto');

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Keeps the short-lived pairing state out of URLs and out of the database.
 * The live-class socket is the authority for the teacher identity; the app
 * proves possession of the one-time code before it can send whiteboard data.
 */
class AppShareService {
  constructor({ now = () => Date.now(), ttlMs = 5 * 60 * 1000 } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  create(roomCode, teacherSocketId) {
    this.removeExpired();
    this.stopForTeacher(teacherSocketId);
    const id = crypto.randomUUID();
    const code = this._uniqueCode();
    const session = {
      id,
      code,
      roomCode: roomCode.toUpperCase(),
      teacherSocketId,
      appSocketId: null,
      expiresAt: this.now() + this.ttlMs,
      strokes: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  join({ roomCode, code, appSocketId }) {
    this.removeExpired();
    const normalizedRoom = roomCode.toUpperCase();
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const session = [...this.sessions.values()].find((candidate) =>
      candidate.roomCode === normalizedRoom && candidate.code === normalizedCode,
    );
    if (!session || (session.appSocketId && session.appSocketId !== appSocketId)) return null;
    session.appSocketId = appSocketId;
    return session;
  }

  getBySocket(socketId) {
    this.removeExpired();
    return [...this.sessions.values()].find((session) =>
      session.appSocketId === socketId || session.teacherSocketId === socketId,
    );
  }

  getByTeacher(socketId) {
    this.removeExpired();
    return [...this.sessions.values()].find((session) => session.teacherSocketId === socketId);
  }

  appendStroke(sessionId, stroke) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.strokes.push(stroke);
    // A reconnect needs enough context to redraw, but a companion session must
    // never become an unbounded in-memory store.
    if (session.strokes.length > 1200) session.strokes.splice(0, 200);
    return session;
  }

  clear(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.strokes = [];
    return session;
  }

  stopForTeacher(socketId) {
    const session = this.getByTeacher(socketId);
    if (session) this.sessions.delete(session.id);
    return session;
  }

  removeExpired() {
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= this.now()) this.sessions.delete(id);
    }
  }

  _uniqueCode() {
    let code;
    do {
      code = Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    } while ([...this.sessions.values()].some((session) => session.code === code));
    return code;
  }
}

module.exports = { AppShareService };
