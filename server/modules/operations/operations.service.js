const { LeaveRequest, Mentor, MentorSession } = require('./operations.model');

exports.requestLeave = ({ instituteId, userId }, payload) => LeaveRequest.create({
  instituteId, teacherId: userId, leaveType: payload.leaveType, startDate: payload.startDate, endDate: payload.endDate, reason: payload.reason
});

exports.reviewLeave = async ({ instituteId, userId }, leaveId, payload) => {
  const request = await LeaveRequest.findOneAndUpdate(
    { _id: leaveId, instituteId, status: 'PENDING' },
    { $set: { status: payload.status, reviewNote: payload.reviewNote || '', reviewedBy: userId, reviewedAt: new Date() } },
    { new: true }
  );
  if (!request) throw new Error('Pending leave request not found.');
  return request;
};

exports.listLeave = ({ instituteId, role, userId }, filters = {}) => {
  const query = { instituteId };
  if (role === 'teacher') query.teacherId = userId;
  if (filters.status) query.status = filters.status;
  return LeaveRequest.find(query).populate('teacherId', 'firstName lastName').sort({ createdAt: -1 });
};

exports.createMentors = async ({ instituteId }, mentors) => Mentor.insertMany(mentors.map(mentor => ({ ...mentor, instituteId })), { ordered: true });

exports.listMentors = ({ instituteId }) => Mentor.find({ instituteId, isActive: true }).sort({ name: 1 });

exports.scheduleMentorSession = async ({ instituteId }, payload) => {
  const startAt = new Date(payload.startAt);
  const endAt = new Date(payload.endAt);
  if (endAt - startAt !== 30 * 60 * 1000) throw new Error('Mentor sessions must be exactly 30 minutes.');
  const mentor = await Mentor.findOne({ _id: payload.mentorId, instituteId, isActive: true });
  if (!mentor) throw new Error('Active mentor not found.');
  const overlapping = await MentorSession.exists({ mentorId: mentor._id, status: 'SCHEDULED', startAt: { $lt: endAt }, endAt: { $gt: startAt } });
  if (overlapping) throw new Error('Mentor is already scheduled for this time.');
  return MentorSession.create({ instituteId, batchId: payload.batchId, mentorId: mentor._id, startAt, endAt, meetingLink: payload.meetingLink });
};

exports.swapMentor = async ({ instituteId }, sessionId, mentorId) => {
  const session = await MentorSession.findOne({ _id: sessionId, instituteId, status: 'SCHEDULED' });
  const mentor = await Mentor.findOne({ _id: mentorId, instituteId, isActive: true });
  if (!session || !mentor) throw new Error('Scheduled session or active mentor not found.');
  const overlapping = await MentorSession.exists({ _id: { $ne: session._id }, mentorId, status: 'SCHEDULED', startAt: { $lt: session.endAt }, endAt: { $gt: session.startAt } });
  if (overlapping) throw new Error('Replacement mentor is already scheduled for this time.');
  session.swappedFromMentorId = session.mentorId;
  session.mentorId = mentor._id;
  return session.save();
};
