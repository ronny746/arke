const AttendanceModel = require('./attendance.model');

exports.markAttendance = async (reqUser, payload) => {
  const query = {
    instituteId: reqUser.instituteId,
    batchId: payload.batchId,
    subjectId: payload.subjectId || null,
    date: new Date(payload.date).setHours(0, 0, 0, 0)
  };

  const update = {
    ...payload,
    instituteId: reqUser.instituteId,
    branchId: reqUser.branchId,
    teacherId: reqUser.userId,
    date: new Date(payload.date).setHours(0, 0, 0, 0)
  };

  const attendance = await AttendanceModel.findOneAndUpdate(query, update, { new: true, upsert: true });

  const absentStudentIds = payload.records.filter(record => record.status === 'absent').map(record => record.studentId);
  if (absentStudentIds.length) {
    const User = require('../users/users.model');
    const Notification = require('../notifications/notifications.model');
    const students = await User.find({ _id: { $in: absentStudentIds }, instituteId: reqUser.instituteId }).select('_id parentId');
    const dateLabel = new Date(payload.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const notifications = students.flatMap(student => [
      { instituteId: reqUser.instituteId, userId: student._id, title: 'Marked absent', message: `You were marked absent on ${dateLabel}.`, type: 'ALERT' },
      ...(student.parentId ? [{ instituteId: reqUser.instituteId, userId: student.parentId, title: 'Child marked absent', message: `Your child was marked absent on ${dateLabel}.`, type: 'ALERT' }] : [])
    ]);
    if (notifications.length) await Notification.insertMany(notifications, { ordered: false });
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

exports.getAttendance = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  
  if (filters.batchId) query.batchId = filters.batchId;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.studentId) query['records.studentId'] = filters.studentId;
  
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  return await AttendanceModel.find(query);
};
