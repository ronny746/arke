const BatchModel = require('./batches.model');

exports.createBatch = async (reqUser, payload) => {
  const batch = new BatchModel({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await batch.save();
};

exports.getBatches = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.role !== 'super_super_admin') {
    query.instituteId = reqUser.instituteId;
  } else if (filters.instituteId) {
    query.instituteId = filters.instituteId;
  }
  
  // If the user is a teacher, restrict batches to the ones they are assigned to
  if (reqUser.role === 'teacher') {
    query.$or = [{ batchTeacherId: reqUser.userId }, { teachers: reqUser.userId }];
  }
  
  if (filters.courseId) query.courseId = filters.courseId;
  return await BatchModel.find(query)
    .populate('courseId', 'name tag fee duration startDate endDate access')
    .populate('batchTeacherId', 'firstName lastName email')
    .populate('teachers', 'firstName lastName email')
    .populate('students', 'firstName lastName email');
};

exports.getMyBatches = async (reqUser) => {
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    query.students = reqUser.userId;
  } else if (['teacher', 'admin_acadops', 'admin_operations'].includes(reqUser.role)) {
    query.$or = [{ batchTeacherId: reqUser.userId }, { teachers: reqUser.userId }];
  }
  return await BatchModel.find(query)
    .populate('courseId', 'name tag access startDate endDate fee duration')
    .populate('batchTeacherId', 'firstName lastName email')
    .populate('teachers', 'firstName lastName email')
    .populate('students', 'firstName lastName email');
};

exports.getBatchById = async (id, reqUser) => {
  return await BatchModel.findOne({ _id: id, instituteId: reqUser.instituteId })
    .populate('batchTeacherId', 'firstName lastName email')
    .populate('teachers', 'firstName lastName email')
    .populate('students', 'firstName lastName email');
};

exports.updateBatch = async (id, payload, reqUser) => {
  return await BatchModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  );
};

exports.deleteBatch = async (id, reqUser) => {
  return await BatchModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};

exports.assignToBatch = async (batchId, userIds, roleInBatch, reqUser) => {
  const updateQuery = {};
  if (roleInBatch === 'student') {
    updateQuery.$addToSet = { students: { $each: userIds } };
  } else if (roleInBatch === 'teacher') {
    // For now, setting the first user as batch teacher
    updateQuery.$set = { batchTeacherId: userIds[0] };
  }
  return await BatchModel.findOneAndUpdate(
    { _id: batchId, instituteId: reqUser.instituteId },
    updateQuery,
    { new: true }
  ).populate('students', 'firstName lastName email').populate('batchTeacherId', 'firstName lastName email');
};

exports.bulkAssignClass = async (batchId, targetClass, targetSection, reqUser) => {
  const UserModel = require('../users/users.model');
  const query = {
    instituteId: reqUser.instituteId,
    role: 'student',
    'metadata.class': targetClass
  };
  if (targetSection) {
    query['metadata.section'] = targetSection;
  }
  const students = await UserModel.find(query).select('_id');

  const studentIds = students.map(s => s._id);

  if (studentIds.length === 0) {
    return { assignedCount: 0 };
  }

  const updatedBatch = await BatchModel.findOneAndUpdate(
    { _id: batchId, instituteId: reqUser.instituteId },
    { $addToSet: { students: { $each: studentIds } } },
    { new: true }
  ).populate('students', 'firstName lastName email').populate('batchTeacherId', 'firstName lastName email');

  return { assignedCount: studentIds.length, batch: updatedBatch };
};

exports.syncStudentBatches = async (studentId, batchIds, reqUser) => {
  // Remove student from batches they are no longer in
  await BatchModel.updateMany(
    { instituteId: reqUser.instituteId, _id: { $nin: batchIds }, students: studentId },
    { $pull: { students: studentId } }
  );

  // Add student to the selected batches
  if (batchIds && batchIds.length > 0) {
    await BatchModel.updateMany(
      { instituteId: reqUser.instituteId, _id: { $in: batchIds } },
      { $addToSet: { students: studentId } }
    );
  }

  return { success: true, message: 'Student batches synced successfully' };
};

exports.joinBatch = async (batchId, reqUser) => {
  const batch = await BatchModel.findOne({ _id: batchId, instituteId: reqUser.instituteId });
  if (!batch) {
    throw new Error('Batch not found');
  }

  const updateQuery = {};
  if (reqUser.role === 'student') {
    updateQuery.$addToSet = { students: reqUser.userId };
  } else if (['teacher', 'admin_acadops', 'admin_operations'].includes(reqUser.role)) {
    // If teacher joins, assign as batch teacher (can be refined later to co-teacher)
    updateQuery.$set = { batchTeacherId: reqUser.userId };
  }

  Object.assign(batch, updateQuery.$set || {});
  if (updateQuery.$addToSet) {
    if (!batch.students.includes(reqUser.userId)) {
      batch.students.push(reqUser.userId);
    }
  }
  return await batch.save();
};
