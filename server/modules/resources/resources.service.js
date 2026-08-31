const Resource = require('./resources.model');

exports.createResource = async (reqUser, payload) => {
  let path = payload.folderPath || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.endsWith('/')) path = path + '/';

  if (!payload.subjectId) {
    delete payload.subjectId;
  }
  if (!payload.classId) {
    delete payload.classId;
  }
  if (!payload.fileUrl) {
    delete payload.fileUrl;
  }
  
  const resource = new Resource({
    ...payload,
    folderPath: path,
    instituteId: reqUser.instituteId,
    uploaderId: reqUser.userId
  });
  return await resource.save();
};

exports.getResources = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId, isActive: true };
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
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;

  return await Resource.find(query)
    .populate('classId', 'name')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 });
};

exports.deleteResource = async (reqUser, resourceId) => {
  const resource = await Resource.findOne({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');
  
  resource.isActive = false;
  return await resource.save();
};
