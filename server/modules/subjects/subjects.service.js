const SubjectModel = require('./subjects.model');

exports.createSubject = async (reqUser, payload) => {
  const subject = new SubjectModel({
    ...payload,
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
  return await SubjectModel.find(query).populate('classId', 'name section').populate('teacherId', 'firstName lastName email');
};

exports.getSubjectById = async (id, reqUser) => {
  return await SubjectModel.findOne({ _id: id, instituteId: reqUser.instituteId })
    .populate('classId', 'name section')
    .populate('teacherId', 'firstName lastName email');
};

exports.updateSubject = async (id, payload, reqUser) => {
  return await SubjectModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  );
};

exports.deleteSubject = async (id, reqUser) => {
  return await SubjectModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};
