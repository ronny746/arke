const LiveClass = require('./live-classes.model');
const ClassSchedule = require('../classes-schedule/classes-schedule.model');
const ZoomService = require('../integrations/zoom.service');

exports.startLiveClass = async (reqOrUser, payload) => {
  let reqUser;
  let req = null;
  if (reqOrUser && reqOrUser.user) {
    req = reqOrUser;
    reqUser = reqOrUser.user;
  } else {
    reqUser = reqOrUser;
  }

  const { classScheduleId, topic, duration, platform, meetingLink, meetingPassword } = payload;

  let finalMeetingLink = meetingLink;
  let finalMeetingPassword = meetingPassword;
  let finalStartUrl = null;
  let finalMeetingId = null;

  if (platform === 'zoom') {
    try {
      const meetingTopic = topic || `Live Class for ${reqUser.userId}`;
      const meetingDuration = duration || 60; // default 60 mins
      const startTime = new Date().toISOString(); // starting now
      
      const zoomMeeting = await ZoomService.createMeeting(meetingTopic, startTime, meetingDuration);
      finalMeetingLink = zoomMeeting.joinUrl;
      finalStartUrl = zoomMeeting.startUrl;
      finalMeetingPassword = zoomMeeting.password;
      finalMeetingId = zoomMeeting.meetingId;
    } catch (err) {
      throw new Error('Failed to create Zoom Meeting: ' + err.message);
    }
  } else if (platform === 'custom') {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl && req) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || (req.get ? req.get('host') : req.headers?.host) || 'localhost:3000';
      frontendUrl = `${protocol}://${host}`;
    } else if (!frontendUrl) {
      frontendUrl = 'http://localhost:3000';
    }
    finalMeetingLink = meetingLink || `${frontendUrl}/class/${roomCode}`;
    finalStartUrl = finalMeetingLink;
    finalMeetingId = roomCode;
  } else if (!finalMeetingLink) {
    throw new Error('Meeting link is required for custom platform');
  }

  const schedule = await ClassSchedule.findById(classScheduleId);
  if (!schedule) throw new Error('Class schedule not found');

  // Prevent starting if another class is already ongoing for this academic class
  const existingSchedulesForClass = await ClassSchedule.find({ classId: schedule.classId }).select('_id');
  const existingOngoingClass = await LiveClass.findOne({
    instituteId: reqUser.instituteId,
    classScheduleId: { $in: existingSchedulesForClass.map(s => s._id) },
    status: 'ONGOING'
  });
  
  if (existingOngoingClass) {
    const err = new Error('A class is already ongoing for this section.');
    err.statusCode = 400;
    throw err;
  }

  // Prevent starting if the teacher is already taking another class
  const teacherOngoingClass = await LiveClass.findOne({
    instituteId: reqUser.instituteId,
    teacherId: schedule.teacherId,
    status: 'ONGOING'
  });

  if (teacherOngoingClass) {
    const err = new Error('You already have an ongoing class.');
    err.statusCode = 400;
    throw err;
  }

  const liveClass = new LiveClass({
    classScheduleId,
    instituteId: reqUser.instituteId,
    teacherId: schedule.teacherId, // Store actual teacher assigned to the schedule
    meetingLink: finalMeetingLink,
    startUrl: finalStartUrl,
    meetingId: finalMeetingId,
    meetingPassword: finalMeetingPassword,
    status: 'ONGOING'
  });
  
  return await liveClass.save();
};

exports.getActiveClasses = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  
  if (filters.status) {
    query.status = filters.status;
  } else if (reqUser.role !== 'PARENT' && reqUser.role !== 'parent') {
    query.status = 'ONGOING';
  }

  if (filters.classScheduleId) query.classScheduleId = filters.classScheduleId;

  const ClassSchedule = require('../classes-schedule/classes-schedule.model');
  const AcademicClass = require('../academic-classes/academic-classes.model');

  // Access Control logic
  if (reqUser.role === 'TEACHER' || reqUser.role === 'teacher') {
    // Teachers only see classes they created/host
    query.teacherId = reqUser.userId;
    return await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'classId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
  } else if (reqUser.role === 'STUDENT' || reqUser.role === 'student') {
    // Students only see classes that belong to their assigned AcademicClass
    const studentClasses = await AcademicClass.find({ instituteId: reqUser.instituteId, students: reqUser.userId }).select('_id');
    const classIds = studentClasses.map(c => c._id);
    
    const schedules = await ClassSchedule.find({ classId: { $in: classIds } }).select('_id');
    const scheduleIds = schedules.map(s => s._id);
    
    query.classScheduleId = { $in: scheduleIds };
    return await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'classId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
  } else if (reqUser.role === 'PARENT' || reqUser.role === 'parent') {
    // Parents see classes of all their children
    const UserModel = require('../users/users.model');
    const parentUser = await UserModel.findById(reqUser.userId).populate('childrenIds', 'firstName lastName email');
    const children = parentUser.childrenIds || [];
    const childrenIds = children.map(c => c._id);
    const childrenEmails = children.map(c => c.email).filter(Boolean);

    const studentClasses = await AcademicClass.find({ instituteId: reqUser.instituteId, students: { $in: childrenIds } }).select('_id');
    const classIds = studentClasses.map(c => c._id);
    
    const schedules = await ClassSchedule.find({ classId: { $in: classIds } }).select('_id');
    const scheduleIds = schedules.map(s => s._id);
    
    query.classScheduleId = { $in: scheduleIds };
    let liveClasses = await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'classId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });

    liveClasses = liveClasses.map(lc => {
      const doc = lc.toObject();
      if (doc.participants && doc.participants.length > 0) {
         doc.participants = doc.participants.filter(p => {
           if (p.userEmail && childrenEmails.includes(p.userEmail)) return true;
           const pName = p.name?.toLowerCase().trim();
           if (!pName) return false;
           return children.some(c => {
             const cName = `${c.firstName} ${c.lastName}`.toLowerCase().trim();
             return pName === cName || pName.includes(c.firstName?.toLowerCase() || '');
           });
         });
      }
      return doc;
    });

    return liveClasses;
  } else {
    // Admins see all
    return await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'classId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
  }
};

exports.endLiveClass = async (id, reqUser, payload = {}) => {
  const query = { _id: id };
  if (reqUser.role === 'TEACHER' || reqUser.role === 'teacher') {
    query.teacherId = reqUser.userId;
  }
  
  const liveClass = await LiveClass.findOne(query);
  if (!liveClass) throw new Error('Live class not found or unauthorized');

  let participantsData = [];
  if (liveClass.meetingId) {
    try {
      const zoomParticipants = await ZoomService.getMeetingParticipants(liveClass.meetingId);
      participantsData = zoomParticipants.map(zp => ({
        zoomUserId: zp.id,
        name: zp.name,
        userEmail: zp.user_email,
        joinTime: zp.join_time ? new Date(zp.join_time) : null,
        leaveTime: zp.leave_time ? new Date(zp.leave_time) : null,
        duration: zp.duration // duration is typically in seconds in Zoom API
      }));
    } catch (e) {
      console.error('[ZOOM] Failed to fetch participants on endLiveClass:', e.message);
    }
  }

  liveClass.status = 'COMPLETED';
  if (payload && payload.recordingUrl) liveClass.recordingUrl = payload.recordingUrl;
  if (participantsData.length > 0) liveClass.participants = participantsData;

  await liveClass.save();
  return liveClass;
};
