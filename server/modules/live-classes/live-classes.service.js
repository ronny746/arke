const LiveClass = require('./live-classes.model');
const ClassSchedule = require('../classes-schedule/classes-schedule.model');
const ZoomService = require('../integrations/zoom.service');

const deriveRoomCode = (liveClass) => {
  if (!liveClass) return null;

  if (liveClass.meetingId && /^[A-Z0-9]{4,}$/i.test(liveClass.meetingId)) {
    return liveClass.meetingId.toUpperCase();
  }

  const primaryUrl = liveClass.meetingLink || liveClass.startUrl;
  if (!primaryUrl || !primaryUrl.includes('/class/')) return null;

  const roomCode = primaryUrl.split('/class/')[1]?.split(/[?#]/)[0];
  return roomCode ? roomCode.toUpperCase() : null;
};

const serializeLiveClass = (liveClass) => {
  if (!liveClass) return liveClass;
  const doc = typeof liveClass.toObject === 'function' ? liveClass.toObject() : { ...liveClass };
  doc.roomCode = deriveRoomCode(doc);
  return doc;
};

exports.startLiveClass = async (reqOrUser, payload) => {
  let reqUser;
  let req = null;
  if (reqOrUser && reqOrUser.user) {
    req = reqOrUser;
    reqUser = reqOrUser.user;
  } else {
    reqUser = reqOrUser;
  }

  const { classScheduleId, topic, duration, platform = 'zoom', meetingLink, meetingPassword } = payload;

  let finalMeetingLink = meetingLink;
  let finalMeetingPassword = meetingPassword;
  let finalStartUrl = null;
  let finalMeetingId = null;

  const targetPlatform = platform || 'zoom';

  if (targetPlatform === 'zoom') {
    if (process.env.ZOOM_CLIENT_ID && process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_SECRET) {
      try {
        const meetingTopic = topic || `Live Class for ${reqUser.userId}`;
        const meetingDuration = duration || 60; // default 60 mins
        const startTime = new Date().toISOString(); // starting now
        
        const zoomMeeting = await ZoomService.createMeeting(meetingTopic, startTime, meetingDuration);
        finalMeetingLink = zoomMeeting.joinUrl;
        finalStartUrl = zoomMeeting.startUrl;
        finalMeetingPassword = zoomMeeting.password;
        finalMeetingId = String(zoomMeeting.meetingId);
      } catch (err) {
        console.error('[ZOOM] Error starting meeting:', err.message);
        throw new Error('Failed to create Zoom Meeting: ' + err.message);
      }
    } else if (meetingLink) {
      // Manual Zoom meeting link provided
      finalMeetingLink = meetingLink;
      finalStartUrl = meetingLink;
      finalMeetingId = meetingLink.split('/j/')[1]?.split('?')[0] || Math.random().toString(36).substring(2, 10);
      finalMeetingPassword = meetingPassword || '';
    } else {
      // A generated URL without a real Zoom meeting is misleading and can
      // never be joined. Admins must configure Zoom or supply a valid link.
      throw new Error('Zoom is not configured. Add Zoom credentials or provide a valid Zoom meeting link.');
    }
  } else if (targetPlatform === 'custom') {
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
    throw new Error('Meeting link is required');
  }

  const schedule = await ClassSchedule.findById(classScheduleId);
  if (!schedule) throw new Error('Class schedule not found');

  // Prevent starting if another class is already ongoing for this academic class
  const existingSchedulesForClass = await ClassSchedule.find({ batchId: schedule.batchId }).select('_id');
  const existingOngoingClass = await LiveClass.findOne({
    instituteId: reqUser.instituteId,
    classScheduleId: { $in: existingSchedulesForClass.map(s => s._id) },
    status: 'ONGOING'
  });
  
  if (existingOngoingClass) {
    const err = new Error('A class is already ongoing for this section.');
    err.statusCode = 409;
    err.liveClass = existingOngoingClass;
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
    err.statusCode = 409;
    err.liveClass = teacherOngoingClass;
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
  
  const savedLiveClass = await liveClass.save();
  return serializeLiveClass(savedLiveClass);
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
  const Batch = require('../batches/batches.model');

  // Access Control logic
  if (reqUser.role === 'TEACHER' || reqUser.role === 'teacher') {
    // Teachers only see classes they created/host
    query.teacherId = reqUser.userId;
    let liveClasses = await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'batchId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
    liveClasses = liveClasses.map(serializeLiveClass);
    if (filters.roomCode) {
      const targetRoomCode = filters.roomCode.toUpperCase();
      liveClasses = liveClasses.filter((liveClass) => liveClass.roomCode === targetRoomCode);
    }
    return liveClasses;
  } else if (reqUser.role === 'STUDENT' || reqUser.role === 'student') {
    // Students only see classes that belong to their assigned AcademicClass
    const studentClasses = await Batch.find({ instituteId: reqUser.instituteId, students: reqUser.userId }).select('_id');
    const classIds = studentClasses.map(c => c._id);
    
    const schedules = await ClassSchedule.find({ batchId: { $in: classIds } }).select('_id');
    const scheduleIds = schedules.map(s => s._id);
    
    query.classScheduleId = { $in: scheduleIds };
    let liveClasses = await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'batchId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
    liveClasses = liveClasses.map(serializeLiveClass);
    if (filters.roomCode) {
      const targetRoomCode = filters.roomCode.toUpperCase();
      liveClasses = liveClasses.filter((liveClass) => liveClass.roomCode === targetRoomCode);
    }
    return liveClasses;
  } else if (reqUser.role === 'PARENT' || reqUser.role === 'parent') {
    // Parents see classes of all their children
    const UserModel = require('../users/users.model');
    const parentUser = await UserModel.findById(reqUser.userId).populate('childrenIds', 'firstName lastName email');
    const children = parentUser.childrenIds || [];
    const childrenIds = children.map(c => c._id);
    const childrenEmails = children.map(c => c.email).filter(Boolean);

    const studentClasses = await Batch.find({ instituteId: reqUser.instituteId, students: { $in: childrenIds } }).select('_id');
    const classIds = studentClasses.map(c => c._id);
    
    const schedules = await ClassSchedule.find({ batchId: { $in: classIds } }).select('_id');
    const scheduleIds = schedules.map(s => s._id);
    
    query.classScheduleId = { $in: scheduleIds };
    let liveClasses = await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'batchId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });

    liveClasses = liveClasses.map(lc => {
      const doc = serializeLiveClass(lc);
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

    if (filters.roomCode) {
      const targetRoomCode = filters.roomCode.toUpperCase();
      liveClasses = liveClasses.filter((liveClass) => liveClass.roomCode === targetRoomCode);
    }

    return liveClasses;
  } else {
    // Admins see all
    let liveClasses = await LiveClass.find(query)
      .populate({ path: 'classScheduleId', populate: [{ path: 'batchId' }, { path: 'subjectId' }] })
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 });
    liveClasses = liveClasses.map(serializeLiveClass);
    if (filters.roomCode) {
      const targetRoomCode = filters.roomCode.toUpperCase();
      liveClasses = liveClasses.filter((liveClass) => liveClass.roomCode === targetRoomCode);
    }
    return liveClasses;
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
  let recordingUrl = payload && payload.recordingUrl ? payload.recordingUrl : liveClass.recordingUrl;

  if (liveClass.meetingId && process.env.ZOOM_CLIENT_ID) {
    try {
      const zoomParticipants = await ZoomService.getMeetingParticipants(liveClass.meetingId);
      if (Array.isArray(zoomParticipants) && zoomParticipants.length > 0) {
        participantsData = zoomParticipants.map(zp => ({
          zoomUserId: zp.id,
          name: zp.name,
          userEmail: zp.user_email,
          joinTime: zp.join_time ? new Date(zp.join_time) : null,
          leaveTime: zp.leave_time ? new Date(zp.leave_time) : null,
          duration: zp.duration
        }));
      }
    } catch (e) {
      console.error('[ZOOM] Failed to fetch participants on endLiveClass:', e.message);
    }

    try {
      const zoomRecordings = await ZoomService.getMeetingRecordings(liveClass.meetingId);
      if (zoomRecordings) {
        const cloudUrl = zoomRecordings.share_url || zoomRecordings.recording_files?.find(f => f.file_type === 'MP4')?.download_url;
        if (cloudUrl) recordingUrl = cloudUrl;
      }
    } catch (e) {
      console.error('[ZOOM] Failed to fetch recordings on endLiveClass:', e.message);
    }
  }

  liveClass.status = 'COMPLETED';
  if (recordingUrl) liveClass.recordingUrl = recordingUrl;
  if (participantsData.length > 0) liveClass.participants = participantsData;

  await liveClass.save();
  return liveClass;
};

exports.syncZoomData = async (id) => {
  const liveClass = await LiveClass.findById(id);
  if (!liveClass) throw new Error('Live class not found');
  if (!liveClass.meetingId) throw new Error('No Zoom Meeting ID found for this class');

  let participantsData = [];
  let recordingUrl = liveClass.recordingUrl || null;

  try {
    const zoomParticipants = await ZoomService.getMeetingParticipants(liveClass.meetingId);
    if (Array.isArray(zoomParticipants) && zoomParticipants.length > 0) {
      participantsData = zoomParticipants.map(zp => ({
        zoomUserId: zp.id,
        name: zp.name,
        userEmail: zp.user_email,
        joinTime: zp.join_time ? new Date(zp.join_time) : null,
        leaveTime: zp.leave_time ? new Date(zp.leave_time) : null,
        duration: zp.duration
      }));
    }
  } catch (e) {
    console.error('[ZOOM Sync] Error fetching participants:', e.message);
  }

  try {
    const zoomRecordings = await ZoomService.getMeetingRecordings(liveClass.meetingId);
    if (zoomRecordings) {
      const cloudUrl = zoomRecordings.share_url || zoomRecordings.recording_files?.find(f => f.file_type === 'MP4')?.download_url;
      if (cloudUrl) recordingUrl = cloudUrl;
    }
  } catch (e) {
    console.error('[ZOOM Sync] Error fetching recordings:', e.message);
  }

  if (participantsData.length > 0) liveClass.participants = participantsData;
  if (recordingUrl) liveClass.recordingUrl = recordingUrl;

  await liveClass.save();
  return liveClass;
};
