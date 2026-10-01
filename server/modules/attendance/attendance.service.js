const AttendanceModel = require('./attendance.model');
const LiveClass = require('../live-classes/live-classes.model');
const Batch = require('../batches/batches.model');
const ClassSchedule = require('../classes-schedule/classes-schedule.model');
const User = require('../users/users.model');
const NotificationsService = require('../notifications/notifications.service');

const IST_OFFSET = '+05:30';
const LATE_GRACE_MINUTES = 10;

const datePartsInIndia = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
};

const attendanceDateInIndia = (value = new Date()) => {
  const { year, month, day } = datePartsInIndia(value);
  return new Date(`${year}-${month}-${day}T00:00:00.000${IST_OFFSET}`);
};

const scheduledStartInIndia = (startTime, value = new Date()) => {
  const { year, month, day } = datePartsInIndia(value);
  return new Date(`${year}-${month}-${day}T${startTime}:00${IST_OFFSET}`);
};

const createLateNotifications = async ({ instituteId, studentId, teacherId, subjectName, batchName, joinedAt }) => {
  const student = await User.findOne({ _id: studentId, instituteId }).select('_id parentId firstName lastName');
  if (!student) return;

  const joinedAtLabel = joinedAt.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit'
  });
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Your child';
  const classLabel = [subjectName, batchName].filter(Boolean).join(' - ') || 'the live class';
  await NotificationsService.createForUsers({
    instituteId,
    userIds: [student._id],
    title: 'Absent attendance recorded',
    message: `You joined ${classLabel} after the 10-minute grace period at ${joinedAtLabel} and were marked absent.`,
    type: 'ALERT',
    metadata: { entityType: 'attendance_late' }
  });
  if (student.parentId) await NotificationsService.createForUsers({
    instituteId,
    userIds: [student.parentId],
    title: 'Child marked absent for late joining',
    message: `${studentName} joined ${classLabel} after the 10-minute grace period at ${joinedAtLabel} and was marked absent.`,
    type: 'ALERT',
    metadata: { entityType: 'attendance_late' }
  });
  if (teacherId) await NotificationsService.createForUsers({
    instituteId,
    userIds: [teacherId],
    title: 'Student marked absent for late joining',
    message: `${studentName} joined ${classLabel} after the 10-minute grace period and was marked absent.`,
    type: 'ALERT',
    metadata: { entityType: 'attendance_absent' }
  });
};

exports.markAttendance = async (reqUser, payload) => {
  const query = {
    instituteId: reqUser.instituteId,
    batchId: payload.batchId,
    subjectId: payload.subjectId || null,
    liveClassId: null,
    date: new Date(payload.date).setHours(0, 0, 0, 0)
  };

  const update = {
    ...payload,
    instituteId: reqUser.instituteId,
    branchId: reqUser.branchId,
    teacherId: reqUser.userId,
    liveClassId: null,
    date: new Date(payload.date).setHours(0, 0, 0, 0)
  };

  const attendance = await AttendanceModel.findOneAndUpdate(query, update, { new: true, upsert: true });

  const absentStudentIds = payload.records.filter(record => record.status === 'absent').map(record => record.studentId);
  if (absentStudentIds.length) {
    const User = require('../users/users.model');
    const students = await User.find({ _id: { $in: absentStudentIds }, instituteId: reqUser.instituteId }).select('_id parentId');
    const dateLabel = new Date(payload.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    await NotificationsService.createForUsers({
      instituteId: reqUser.instituteId,
      userIds: students.map(student => student._id),
      title: 'Marked absent',
      message: `You were marked absent on ${dateLabel}.`,
      type: 'ALERT',
      metadata: { entityType: 'attendance_absent' }
    });
    await NotificationsService.createForUsers({
      instituteId: reqUser.instituteId,
      userIds: students.map(student => student.parentId).filter(Boolean),
      title: 'Child marked absent',
      message: `Your child was marked absent on ${dateLabel}.`,
      type: 'ALERT',
      metadata: { entityType: 'attendance_absent' }
    });
  }
  return attendance;
};

exports.geoCheckin = async (reqUser, payload) => {
  const query = {
    instituteId: reqUser.instituteId,
    batchId: payload.batchId,
    date: new Date().setHours(0, 0, 0, 0)
  };

  const attendanceDoc = await AttendanceModel.findOne(query);

  const studentRecord = {
    studentId: reqUser.userId,
    status: 'present',
    geoCheckIn: {
      lat: payload.latitude,
      lng: payload.longitude,
      timestamp: new Date()
    }
  };

  if (!attendanceDoc) {
    // Create new attendance record for the day
    return await AttendanceModel.create({
      ...query,
      branchId: reqUser.branchId,
      records: [studentRecord]
    });
  } else {
    // Update existing record for this student or push new one
    const existingRecordIndex = attendanceDoc.records.findIndex(r => r.studentId.toString() === reqUser.userId.toString());
    if (existingRecordIndex >= 0) {
      attendanceDoc.records[existingRecordIndex].status = 'present';
      attendanceDoc.records[existingRecordIndex].geoCheckIn = studentRecord.geoCheckIn;
    } else {
      attendanceDoc.records.push(studentRecord);
    }
    return await attendanceDoc.save();
  }
};

exports.liveClassCheckin = async (reqUser, { liveClassId }) => {
  const liveClass = await LiveClass.findOne({
    _id: liveClassId,
    instituteId: reqUser.instituteId,
    status: 'ONGOING'
  });
  if (!liveClass) throw new Error('This live class is no longer active.');

  const schedule = await ClassSchedule.findOne({
    _id: liveClass.classScheduleId,
    instituteId: reqUser.instituteId
  }).populate('subjectId', 'name').lean();
  if (!schedule) throw new Error('Class schedule not found.');

  const enrolledBatch = await Batch.exists({
    _id: schedule.batchId,
    instituteId: reqUser.instituteId,
    students: reqUser.userId
  });
  if (!enrolledBatch) throw new Error('You are not enrolled in this class.');

  const joinedAt = new Date();
  const scheduledAt = scheduledStartInIndia(schedule.startTime, joinedAt);
  const isLate = joinedAt.getTime() > scheduledAt.getTime() + LATE_GRACE_MINUTES * 60 * 1000;
  const status = isLate ? 'absent' : 'present';
  const date = attendanceDateInIndia(joinedAt);

  let attendance = await AttendanceModel.findOne({
    instituteId: reqUser.instituteId,
    liveClassId: liveClass._id
  });

  if (!attendance) {
    attendance = new AttendanceModel({
      instituteId: reqUser.instituteId,
      branchId: reqUser.branchId,
      batchId: schedule.batchId,
      subjectId: schedule.subjectId?._id || schedule.subjectId || null,
      liveClassId: liveClass._id,
      date,
      teacherId: schedule.teacherId,
      records: []
    });
  }

  const existing = attendance.records.find(record => record.studentId.toString() === reqUser.userId.toString());
  if (!existing) {
    attendance.records.push({
      studentId: reqUser.userId,
      status,
      joinedAt,
      joinEvents: [{ joinedAt, source: 'live_class' }],
      source: 'live_class'
    });
    try {
      await attendance.save();
    } catch (error) {
      // Double taps / simultaneous app callbacks can race on the unique
      // live-class attendance index. Treat the already-created register as
      // the same idempotent check-in instead of returning HTTP 409.
      if (error?.code !== 11000) throw error;
      attendance = await AttendanceModel.findOne({ instituteId: reqUser.instituteId, liveClassId: liveClass._id });
    }

    if (isLate) {
      const batchInfo = await Batch.findById(schedule.batchId).select('name section').lean();
      const batchName = batchInfo
        ? [batchInfo.name, batchInfo.section ? `Section ${batchInfo.section}` : ''].filter(Boolean).join(' • ')
        : '';
      await createLateNotifications({
        instituteId: reqUser.instituteId,
        studentId: reqUser.userId,
        teacherId: schedule.teacherId,
        subjectName: schedule.subjectId?.name,
        batchName,
        joinedAt
      });
    }
  }

  return {
    attendanceId: attendance._id,
    status: existing?.status || status,
    joinedAt: existing?.joinedAt || joinedAt,
    wasAlreadyRecorded: Boolean(existing)
  };
};

exports.getAttendance = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };

  const role = String(reqUser.role || '').toLowerCase();
  if (role === 'student') query['records.studentId'] = reqUser.userId;
  // Teachers may view the attendance only for classes assigned to them; admins
  // retain institute-wide operational visibility.
  if (role === 'teacher') query.teacherId = reqUser.userId;
  
  if (filters.batchId) query.batchId = filters.batchId;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.studentId) query['records.studentId'] = filters.studentId;
  
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  const registers = await AttendanceModel.find(query)
    .populate({ path: 'batchId', select: 'name section courseId', populate: { path: 'courseId', select: 'name' } })
    .populate('subjectId', 'name')
    .populate('teacherId', 'firstName lastName')
    .populate('records.studentId', 'firstName lastName admissionNumber');

  // A student (and a parent requesting one or more linked children) must
  // never receive classmates' attendance records inside a shared register.
  // Teachers/admins retain the full class register needed for operations.
  const requestedStudentIds = role === 'student'
    ? [String(reqUser.userId)]
    : typeof filters.studentId === 'string'
      ? [filters.studentId]
      : Array.isArray(filters.studentId?.$in)
        ? filters.studentId.$in.map(String)
        : null;

  if (!requestedStudentIds) return registers;
  return registers.map(register => {
    const row = register.toObject();
    row.records = (row.records || []).filter(record => requestedStudentIds.includes(String(record.studentId?._id || record.studentId)));
    return row;
  });
};
