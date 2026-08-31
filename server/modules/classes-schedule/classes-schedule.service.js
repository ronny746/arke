const ClassSchedule = require('./classes-schedule.model');
const ScheduleOverride = require('./schedule-override.model');

exports.createSchedule = async (reqUser, payload) => {
  const schedule = new ClassSchedule({
    ...payload,
    instituteId: reqUser.instituteId,
    branchId: reqUser.branchId
  });

  return await schedule.save();
};

exports.createOverride = async (reqUser, payload) => {
  const override = new ScheduleOverride({
    ...payload,
    instituteId: reqUser.instituteId,
    createdBy: reqUser.userId
  });

  return await override.save();
};

exports.getSchedule = async (reqUser, filters) => {
  const query = {};
  if (reqUser.role !== 'super_super_admin') {
    query.instituteId = reqUser.instituteId;
  } else if (filters.instituteId) {
    query.instituteId = filters.instituteId;
  }
  
  if (reqUser.role === 'student') {
    const AcademicClassModel = require('../academic-classes/academic-classes.model');
    const studentClass = await AcademicClassModel.findOne({ students: reqUser.userId });
    if (studentClass) {
      query.classId = studentClass._id;
    } else {
      return [];
    }
  } else if (filters.classId) {
    query.classId = filters.classId;
  }
  if (filters.teacherId) query.teacherId = filters.teacherId;
  
  if (filters.date) {
    query.dayOfWeek = new Date(filters.date).getDay();
  } else if (filters.dayOfWeek !== undefined) {
    query.dayOfWeek = filters.dayOfWeek;
  }

  return await ClassSchedule.find(query)
    .populate('teacherId', 'firstName lastName email')
    .populate('classId', 'name section')
    .populate('subjectId', 'name')
    .sort({ dayOfWeek: 1, startTime: 1 });
};

exports.getCalculatedSchedule = async (reqUser, dateString, filters = {}) => {
  const date = new Date(dateString);
  const startOfDay = new Date(date.setHours(0,0,0,0));
  const endOfDay = new Date(date.setHours(23,59,59,999));
  const dayOfWeek = startOfDay.getDay();
  
  // 1. Build base query for recurring and overrides
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    const AcademicClassModel = require('../academic-classes/academic-classes.model');
    const studentClass = await AcademicClassModel.findOne({ students: reqUser.userId });
    if (studentClass) {
      query.classId = studentClass._id;
    } else {
      return [];
    }
  } else if (filters.classId) {
    query.classId = filters.classId;
  }
  if (reqUser.role === 'teacher') {
    query.teacherId = reqUser.userId;
  } else if (filters.teacherId) {
    query.teacherId = filters.teacherId;
  }

  // 2. Fetch recurring schedules for the specific day of the week
  const recurringQuery = {
    ...query,
    dayOfWeek,
    isActive: true,
    startDate: { $lte: endOfDay },
    $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: startOfDay } }]
  };
  
  const recurring = await ClassSchedule.find(recurringQuery)
    .populate('teacherId', 'firstName lastName email')
    .populate('classId', 'name section')
    .populate('subjectId', 'name')
    .lean();

  // 3. Fetch overrides for this specific date
  const overrideQuery = {
    ...query,
    overrideDate: { $gte: startOfDay, $lte: endOfDay }
  };
  const overrides = await ScheduleOverride.find(overrideQuery)
    .populate('teacherId', 'firstName lastName email')
    .populate('classId', 'name section')
    .populate('subjectId', 'name')
    .lean();

  // 4. Calculate Final List
  let finalSchedule = [];
  
  const overridesByRecurringId = {};
  overrides.forEach(o => {
    if (o.recurringScheduleId) overridesByRecurringId[o.recurringScheduleId.toString()] = o;
  });

  // Process Recurring Classes
  for (let c of recurring) {
    const override = overridesByRecurringId[c._id.toString()];
    if (override) {
      if (override.overrideType === 'CANCELLED') {
        continue; // Exclude from final list
      } else if (override.overrideType === 'RESCHEDULED') {
        c.startTime = override.newStartTime || c.startTime;
        c.endTime = override.newEndTime || c.endTime;
        c.isRescheduled = true;
        c.overrideReason = override.reason;
      }
    }
    c.type = 'RECURRING';
    finalSchedule.push(c);
  }

  // Process Extra Classes
  const extraClasses = overrides.filter(o => o.overrideType === 'EXTRA_CLASS').map(o => ({
    _id: o._id,
    instituteId: o.instituteId,
    classId: o.classId,
    subjectId: o.subjectId,
    teacherId: o.teacherId,
    startTime: o.newStartTime,
    endTime: o.newEndTime,
    type: 'EXTRA_CLASS',
    overrideReason: o.reason
  }));

  finalSchedule = [...finalSchedule, ...extraClasses];

  // Sort by start time
  finalSchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return finalSchedule;
};

exports.deleteSchedule = async (id, reqUser) => {
  return await ClassSchedule.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};
