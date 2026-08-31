const DoubtSession = require('./doubt-sessions.model');

exports.requestSession = async (reqUser, payload) => {
  const session = new DoubtSession({
    ...payload,
    instituteId: reqUser.instituteId,
    studentId: reqUser.userId
  });
  return await session.save();
};

exports.getSessions = async (reqUser) => {
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    query.studentId = reqUser.userId;
  } else if (reqUser.role === 'teacher') {
    query.teacherId = reqUser.userId;
  }

  return await DoubtSession.find(query)
    .populate('studentId', 'firstName lastName')
    .populate('teacherId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

exports.scheduleSession = async (sessionId, teacherId, payload) => {
  const session = await DoubtSession.findOneAndUpdate(
    { _id: sessionId, teacherId },
    { ...payload, status: 'SCHEDULED' },
    { new: true }
  );
  if (!session) throw new Error('Session not found or unauthorized');
  return session;
};

exports.resolveSession = async (sessionId, userId, payload) => {
  // Both student and teacher should be able to resolve it ideally, but let's allow either
  const session = await DoubtSession.findOneAndUpdate(
    { _id: sessionId, $or: [{ teacherId: userId }, { studentId: userId }] },
    { ...payload, status: 'RESOLVED' },
    { new: true }
  );
  if (!session) throw new Error('Session not found or unauthorized');
  return session;
};
