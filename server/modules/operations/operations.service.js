const { LeaveRequest, Mentor, MentorSession } = require('./operations.model');
const ZoomService = require('../integrations/zoom.service');
const User = require('../users/users.model');
const Batch = require('../batches/batches.model');
const Course = require('../courses/courses.model');
const NotificationsService = require('../notifications/notifications.service');

exports.requestLeave = async ({ instituteId, userId }, payload, io) => {
  const request = await LeaveRequest.create({
    instituteId, teacherId: userId, leaveType: payload.leaveType, startDate: payload.startDate, endDate: payload.endDate, reason: payload.reason
  });
  const admins = await User.find({ instituteId, role: 'admin', isActive: true }).select('_id');
  await NotificationsService.createForUsers({
    instituteId,
    userIds: admins.map(admin => admin._id),
    title: 'Teacher leave request',
    message: 'A teacher has submitted a leave request for approval.',
    io
  });
  return request;
};

exports.reviewLeave = async ({ instituteId, userId }, leaveId, payload, io) => {
  const request = await LeaveRequest.findOneAndUpdate(
    { _id: leaveId, instituteId, status: 'PENDING' },
    { $set: { status: payload.status, reviewNote: payload.reviewNote || '', reviewedBy: userId, reviewedAt: new Date() } },
    { new: true }
  );
  if (!request) throw new Error('Pending leave request not found.');
  await NotificationsService.createForUsers({
    instituteId,
    userIds: [request.teacherId],
    title: `Leave request ${request.status.toLowerCase()}`,
    message: request.status === 'APPROVED'
      ? 'Your leave request has been approved.'
      : `Your leave request was rejected${request.reviewNote ? `: ${request.reviewNote}` : '.'}`,
    type: request.status === 'APPROVED' ? 'SUCCESS' : 'ALERT',
    io
  });
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

exports.validateMentorWindow = ({ startAt, endAt }) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error('Enter a valid mentor session start and end time.');
  }
  if (end - start !== 30 * 60 * 1000) throw new Error('Mentor sessions must be exactly 30 minutes.');
  return { startAt: start, endAt: end };
};

async function resolveAudience(instituteId, payload) {
  const hasBatch = Boolean(payload.batchId);
  const hasCourse = Boolean(payload.courseId);
  if (hasBatch === hasCourse) throw new Error('Choose either one batch or one course for this mentor session.');
  if (hasBatch) {
    const batch = await Batch.findOne({ _id: payload.batchId, instituteId, isActive: true }).select('_id name students courseId');
    if (!batch) throw new Error('Active batch not found.');
    return { batchId: batch._id, courseId: batch.courseId || null, recipients: batch.students.map(String), label: batch.name };
  }
  const course = await Course.findOne({ _id: payload.courseId, instituteId, isActive: true }).select('_id name');
  if (!course) throw new Error('Active course not found.');
  const batches = await Batch.find({ instituteId, courseId: course._id, isActive: true }).select('students');
  return {
    batchId: null,
    courseId: course._id,
    recipients: [...new Set(batches.flatMap(batch => batch.students.map(String)))],
    label: course.name
  };
}

exports.scheduleMentorSession = async ({ instituteId }, payload, io) => {
  const { startAt, endAt } = exports.validateMentorWindow(payload);
  const mentor = await Mentor.findOne({ _id: payload.mentorId, instituteId, isActive: true });
  if (!mentor) throw new Error('Active mentor not found.');
  const audience = await resolveAudience(instituteId, payload);
  const overlapping = await MentorSession.exists({ mentorId: mentor._id, status: 'SCHEDULED', startAt: { $lt: endAt }, endAt: { $gt: startAt } });
  if (overlapping) throw new Error('Mentor is already scheduled for this time.');
  let meetingLink = payload.meetingLink || '';
  let meetingId = '';
  let meetingPassword = '';
  if (!meetingLink) {
    if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) throw new Error('Zoom is not configured. Add Zoom credentials or provide a meeting link.');
    const zoomMeeting = await ZoomService.createMeeting(`${mentor.name} mentor session — ${audience.label}`, startAt, Math.max(1, Math.round((endAt - startAt) / 60000)));
    meetingLink = zoomMeeting.joinUrl;
    meetingId = String(zoomMeeting.meetingId || '');
    meetingPassword = zoomMeeting.password || '';
  }
  const session = await MentorSession.create({
    instituteId,
    batchId: audience.batchId,
    courseId: audience.courseId,
    mentorId: mentor._id,
    startAt,
    endAt,
    meetingLink, meetingId, meetingPassword
  });
  const schedule = startAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  await NotificationsService.createForUsers({
    instituteId,
    userIds: audience.recipients,
    title: 'Mentor session scheduled',
    message: `${mentor.name} will mentor ${audience.label} on ${schedule}.`,
    type: 'INFO',
    metadata: { entityType: 'mentor_session', sessionId: String(session._id), meetingLink: session.meetingLink, actionUrl: session.meetingLink },
    io
  });
  return session.populate([{ path: 'mentorId', select: 'name email phone' }, { path: 'batchId', select: 'name' }, { path: 'courseId', select: 'name' }]);
};

exports.updateMentorSession = async ({ instituteId }, sessionId, payload, io) => {
  const session = await MentorSession.findOne({ _id: sessionId, instituteId, status: 'SCHEDULED' });
  if (!session) throw new Error('Scheduled mentor session not found.');
  const mentorId = payload.mentorId || session.mentorId;
  const mentor = await Mentor.findOne({ _id: mentorId, instituteId, isActive: true });
  if (!mentor) throw new Error('Active mentor not found.');
  const window = payload.startAt || payload.endAt ? exports.validateMentorWindow({ startAt: payload.startAt || session.startAt, endAt: payload.endAt || session.endAt }) : { startAt: session.startAt, endAt: session.endAt };
  const conflict = await MentorSession.exists({ _id: { $ne: session._id }, mentorId, status: 'SCHEDULED', startAt: { $lt: window.endAt }, endAt: { $gt: window.startAt } });
  if (conflict) throw new Error('Mentor is already scheduled for this time.');
  session.mentorId = mentorId; session.startAt = window.startAt; session.endAt = window.endAt;
  if (payload.meetingLink !== undefined) session.meetingLink = payload.meetingLink;
  await session.save();
  const audience = await resolveAudience(instituteId, { batchId: session.batchId, courseId: session.courseId });
  const schedule = session.startAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  await NotificationsService.createForUsers({ instituteId, userIds: audience.recipients, title: 'Mentor session updated', message: `${mentor.name}'s session for ${audience.label} is now scheduled on ${schedule}.`, type: 'INFO', metadata: { entityType: 'mentor_session', sessionId: String(session._id), meetingLink: session.meetingLink, actionUrl: session.meetingLink }, io });
  return session.populate([{ path: 'mentorId', select: 'name email phone' }, { path: 'batchId', select: 'name' }, { path: 'courseId', select: 'name' }]);
};

exports.listMentorSessions = ({ instituteId }) => MentorSession.find({ instituteId })
  .populate('mentorId', 'name email phone')
  .populate('batchId', 'name')
  .populate('courseId', 'name')
  .sort({ startAt: 1 });

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
