const AcademicClassModel = require('./academic-classes.model');

exports.createClass = async (reqUser, payload) => {
  const academicClass = new AcademicClassModel({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await academicClass.save();
};

exports.getClasses = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.role !== 'super_super_admin') {
    query.instituteId = reqUser.instituteId;
  } else if (filters.instituteId) {
    query.instituteId = filters.instituteId;
  }
  return await AcademicClassModel.find(query).populate('classTeacherId', 'firstName lastName email').populate('students', 'firstName lastName email');
};

exports.getMyClasses = async (reqUser) => {
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    query.students = reqUser.userId;
  } else if (['teacher', 'admin_acadops', 'admin_operations'].includes(reqUser.role)) {
    query.classTeacherId = reqUser.userId;
  }
  return await AcademicClassModel.find(query)
    .populate('classTeacherId', 'firstName lastName email')
    .populate('students', 'firstName lastName email');
};

exports.getClassById = async (id, reqUser) => {
  return await AcademicClassModel.findOne({ _id: id, instituteId: reqUser.instituteId })
    .populate('classTeacherId', 'firstName lastName email')
    .populate('students', 'firstName lastName email');
};

exports.updateClass = async (id, payload, reqUser) => {
  return await AcademicClassModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  );
};

exports.deleteClass = async (id, reqUser) => {
  return await AcademicClassModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};

exports.assignToClass = async (classId, userIds, roleInClass, reqUser) => {
  const updateQuery = {};
  if (roleInClass === 'student') {
    updateQuery.$addToSet = { students: { $each: userIds } };
  } else if (roleInClass === 'teacher') {
    // For now, setting the first user as class teacher
    updateQuery.$set = { classTeacherId: userIds[0] };
  }
  return await AcademicClassModel.findOneAndUpdate(
    { _id: classId, instituteId: reqUser.instituteId },
    updateQuery,
    { new: true }
  ).populate('students', 'firstName lastName email').populate('classTeacherId', 'firstName lastName email');
};

exports.joinClass = async (classId, reqUser) => {
  const academicClass = await AcademicClassModel.findOne({ _id: classId, instituteId: reqUser.instituteId });
  if (!academicClass) {
    throw new Error('Class not found');
  }

  const updateQuery = {};
  if (reqUser.role === 'student') {
    updateQuery.$addToSet = { students: reqUser.userId };
  } else if (['teacher', 'admin_acadops', 'admin_operations'].includes(reqUser.role)) {
    // If teacher joins, assign as class teacher (can be refined later to co-teacher)
    updateQuery.$set = { classTeacherId: reqUser.userId };
  }

  Object.assign(academicClass, updateQuery.$set || {});
  if (updateQuery.$addToSet) {
    if (!academicClass.students.includes(reqUser.userId)) {
      academicClass.students.push(reqUser.userId);
    }
  }
  return await academicClass.save();
};
