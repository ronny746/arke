const SubjectModel = require('./subjects.model');
const UserModel = require('../users/users.model');

async function validateTeacher(teacherId, instituteId) {
  if (!teacherId) return;
  const teacher = await UserModel.exists({ _id: teacherId, instituteId, role: 'teacher', isActive: true });
  if (!teacher) {
    const error = new Error('Select an active teacher from this institute.');
    error.statusCode = 422;
    throw error;
  }
}

exports.createSubject = async (reqUser, payload) => {
  await validateTeacher(payload.teacherId, reqUser.instituteId);
  if (!payload.batchId && !payload.isLibrarySubject) {
    const error = new Error('Choose a batch or save the subject to the Subject Library.');
    error.statusCode = 422;
    throw error;
  }
  const subject = new SubjectModel({
    ...payload,
    classId: payload.batchId,
    instituteId: reqUser.instituteId
  });
  return await subject.save();
};

exports.getSubjects = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.role !== 'super_admin') {
    query.instituteId = reqUser.instituteId;
  } else if (filters.instituteId) {
    query.instituteId = filters.instituteId;
  }
  if (filters.libraryOnly === true || filters.libraryOnly === 'true') query.isLibrarySubject = true;
  return await SubjectModel.find(query).populate('batchId', 'name section').populate('teacherId', 'firstName lastName email');
};

exports.getSubjectById = async (id, reqUser) => {
  return await SubjectModel.findOne({ _id: id, instituteId: reqUser.instituteId })
    .populate('batchId', 'name section')
    .populate('teacherId', 'firstName lastName email');
};

exports.updateSubject = async (id, payload, reqUser) => {
  await validateTeacher(payload.teacherId, reqUser.instituteId);
  const updatePayload = { ...payload };
  if (payload.batchId) {
    updatePayload.classId = payload.batchId;
  }

  return await SubjectModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    updatePayload,
    { new: true }
  );
};

exports.deleteSubject = async (id, reqUser) => {
  return await SubjectModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};
