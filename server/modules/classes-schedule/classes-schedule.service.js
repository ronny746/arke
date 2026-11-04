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

exports.bulkSaveSchedules = async (reqUser, payload) => {
  const { batchId, schedules } = payload;
  if (!batchId || !Array.isArray(schedules)) {
    throw new Error('batchId and schedules array are required');
  }

  // Delete existing recurring schedules for this batch in this institute
  await ClassSchedule.deleteMany({
    instituteId: reqUser.instituteId,
    batchId: batchId
  });

  if (schedules.length === 0) {
    return [];
  }

  const docs = schedules.map(s => ({
    instituteId: reqUser.instituteId,
    branchId: reqUser.branchId,
    batchId: batchId,
    subjectId: s.subjectId || null,
    teacherId: s.teacherId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    isRecurring: s.isRecurring !== undefined ? s.isRecurring : true,
    isActive: true
  }));

  return await ClassSchedule.insertMany(docs);
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
    const BatchModel = require('../batches/batches.model');
    const studentClasses = await BatchModel.find({ students: reqUser.userId });
    if (studentClasses && studentClasses.length > 0) {
      query.batchId = { $in: studentClasses.map(c => c._id) };
    } else {
      return [];
    }
  } else if (filters.batchId) {
    query.batchId = filters.batchId;
  }
  if (reqUser.role === 'teacher') {
    query.teacherId = reqUser.userId;
  } else if (filters.teacherId) {
    query.teacherId = filters.teacherId;
  }
  
  if (filters.date) {
    query.dayOfWeek = new Date(filters.date).getDay();
  } else if (filters.dayOfWeek !== undefined) {
    query.dayOfWeek = filters.dayOfWeek;
  }

  return await ClassSchedule.find(query)
    .populate('teacherId', 'firstName lastName email')
    .populate('batchId', 'name section')
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
    const BatchModel = require('../batches/batches.model');
    const studentClasses = await BatchModel.find({ students: reqUser.userId });
    if (studentClasses && studentClasses.length > 0) {
      query.batchId = { $in: studentClasses.map(c => c._id) };
    } else {
      return [];
    }
  } else if (filters.batchId) {
    query.batchId = filters.batchId;
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
    .populate('batchId', 'name section')
    .populate('subjectId', 'name')
    .lean();

  // 3. Fetch overrides for this specific date
  const overrideQuery = {
    ...query,
    overrideDate: { $gte: startOfDay, $lte: endOfDay }
  };
  const overrides = await ScheduleOverride.find(overrideQuery)
    .populate('teacherId', 'firstName lastName email')
    .populate('batchId', 'name section')
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
    batchId: o.batchId,
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

exports.moveSchedule = async (reqUser, payload) => {
  const { sourceId, targetDayOfWeek, targetStartTime, targetEndTime, targetId } = payload;
  if (!sourceId || targetDayOfWeek === undefined || !targetStartTime || !targetEndTime) {
    throw new Error('sourceId, targetDayOfWeek, targetStartTime, and targetEndTime are required');
  }

  const sourceSchedule = await ClassSchedule.findOne({
    _id: sourceId,
    instituteId: reqUser.instituteId
  });

  if (!sourceSchedule) {
    throw new Error('Source class schedule not found');
  }

  // Check if moving to exact same position
  if (
    sourceSchedule.dayOfWeek === targetDayOfWeek &&
    sourceSchedule.startTime === targetStartTime &&
    sourceSchedule.endTime === targetEndTime
  ) {
    return { type: 'UNCHANGED', source: sourceSchedule };
  }

  // Find if there is already a schedule at the target cell in this batch
  let targetSchedule = null;
  if (targetId) {
    targetSchedule = await ClassSchedule.findOne({
      _id: targetId,
      instituteId: reqUser.instituteId
    });
  } else {
    targetSchedule = await ClassSchedule.findOne({
      instituteId: reqUser.instituteId,
      batchId: sourceSchedule.batchId,
      dayOfWeek: targetDayOfWeek,
      startTime: targetStartTime,
      endTime: targetEndTime
    });
  }

  if (targetSchedule && targetSchedule._id.toString() !== sourceSchedule._id.toString()) {
    // Check if swapping causes teacher conflict with another batch
    // Source teacher at target slot:
    const sourceTeacherConflict = await ClassSchedule.findOne({
      _id: { $nin: [sourceSchedule._id, targetSchedule._id] },
      instituteId: reqUser.instituteId,
      teacherId: sourceSchedule.teacherId,
      dayOfWeek: targetDayOfWeek,
      startTime: targetStartTime
    }).populate('batchId', 'name');

    if (sourceTeacherConflict) {
      const batchName = sourceTeacherConflict.batchId?.name || 'another batch';
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDayOfWeek];
      throw new Error(`Teacher is already scheduled on ${dayName} at ${targetStartTime} in ${batchName}.`);
    }

    // Target teacher at source slot:
    const targetTeacherConflict = await ClassSchedule.findOne({
      _id: { $nin: [sourceSchedule._id, targetSchedule._id] },
      instituteId: reqUser.instituteId,
      teacherId: targetSchedule.teacherId,
      dayOfWeek: sourceSchedule.dayOfWeek,
      startTime: sourceSchedule.startTime
    }).populate('batchId', 'name');

    if (targetTeacherConflict) {
      const batchName = targetTeacherConflict.batchId?.name || 'another batch';
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][sourceSchedule.dayOfWeek];
      throw new Error(`Teacher is already scheduled on ${dayName} at ${sourceSchedule.startTime} in ${batchName}.`);
    }

    const oldDayOfWeek = sourceSchedule.dayOfWeek;
    const oldStartTime = sourceSchedule.startTime;
    const oldEndTime = sourceSchedule.endTime;

    // Use a temporary dayOfWeek (-1) via MongoDB driver to bypass unique index during swap
    await ClassSchedule.collection.updateOne(
      { _id: sourceSchedule._id },
      { $set: { dayOfWeek: -1 } }
    );

    await ClassSchedule.collection.updateOne(
      { _id: targetSchedule._id },
      { $set: { dayOfWeek: oldDayOfWeek, startTime: oldStartTime, endTime: oldEndTime } }
    );

    await ClassSchedule.collection.updateOne(
      { _id: sourceSchedule._id },
      { $set: { dayOfWeek: targetDayOfWeek, startTime: targetStartTime, endTime: targetEndTime } }
    );

    const [updatedSource, updatedTarget] = await Promise.all([
      ClassSchedule.findById(sourceSchedule._id)
        .populate('teacherId', 'firstName lastName email')
        .populate('batchId', 'name section')
        .populate('subjectId', 'name'),
      ClassSchedule.findById(targetSchedule._id)
        .populate('teacherId', 'firstName lastName email')
        .populate('batchId', 'name section')
        .populate('subjectId', 'name')
    ]);

    return { type: 'SWAP', source: updatedSource, target: updatedTarget };
  } else {
    // Check if moving to empty slot causes teacher conflict in another batch
    const conflict = await ClassSchedule.findOne({
      _id: { $ne: sourceSchedule._id },
      instituteId: reqUser.instituteId,
      teacherId: sourceSchedule.teacherId,
      dayOfWeek: targetDayOfWeek,
      startTime: targetStartTime
    }).populate('batchId', 'name');

    if (conflict) {
      const batchName = conflict.batchId?.name || 'another batch';
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDayOfWeek];
      throw new Error(`Teacher is already scheduled on ${dayName} at ${targetStartTime} in ${batchName}.`);
    }

    await ClassSchedule.collection.updateOne(
      { _id: sourceSchedule._id },
      { $set: { dayOfWeek: targetDayOfWeek, startTime: targetStartTime, endTime: targetEndTime } }
    );

    const updated = await ClassSchedule.findById(sourceSchedule._id)
      .populate('teacherId', 'firstName lastName email')
      .populate('batchId', 'name section')
      .populate('subjectId', 'name');

    return { type: 'MOVE', source: updated };
  }
};

exports.updateSchedule = async (id, reqUser, payload) => {
  const schedule = await ClassSchedule.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    { $set: payload },
    { new: true, runValidators: true }
  )
    .populate('teacherId', 'firstName lastName email')
    .populate('batchId', 'name section')
    .populate('subjectId', 'name');

  if (!schedule) {
    throw new Error('Class schedule not found');
  }
  return schedule;
};
