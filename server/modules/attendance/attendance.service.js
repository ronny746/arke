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

  return await AttendanceModel.findOneAndUpdate(query, update, { new: true, upsert: true });
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
