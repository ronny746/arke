const Resource = require('./resources.model');

exports.createResource = async (reqUser, payload) => {
  let path = payload.folderPath || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.endsWith('/')) path = path + '/';

  if (!payload.subjectId) {
    delete payload.subjectId;
  }
  if (!payload.batchIds && !payload.batchId) {
    delete payload.batchId;
    delete payload.batchIds;
  }
  if (!payload.fileUrl) {
    delete payload.fileUrl;
  }
  
  if (reqUser.role === 'teacher') {
    const targetBatches = [];
    if (payload.batchId) targetBatches.push(payload.batchId.toString());
    if (payload.batchIds) payload.batchIds.forEach(id => targetBatches.push(id.toString()));
    
    if (targetBatches.length > 0) {
      const BatchModel = require('../batches/batches.model');
      const teacherBatches = await BatchModel.find({
        instituteId: reqUser.instituteId,
        $or: [{ batchTeacherId: reqUser.userId }, { teachers: reqUser.userId }]
      });
      const validIds = teacherBatches.map(b => b._id.toString());
      
      const isInvalid = targetBatches.some(id => !validIds.includes(id));
      if (isInvalid) {
        throw new Error('Forbidden: You can only upload materials to batches you are assigned to.');
      }
    }
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
  const query = { instituteId: reqUser.instituteId };
  if (reqUser.role === 'student') {
    query.isActive = { $ne: false };
    const BatchModel = require('../batches/batches.model');
    const studentClasses = await BatchModel.find({ students: reqUser.userId });
    if (studentClasses && studentClasses.length > 0) {
      const classIds = studentClasses.map(c => c._id);
      query.$or = [
        { batchIds: { $in: classIds } },
        { batchIds: { $size: 0 } },
        { batchIds: { $exists: false } },
        { batchId: { $in: classIds } },
        { batchId: null },
        { batchId: { $exists: false } }
      ];
    } else {
      query.$or = [
        { batchIds: { $size: 0 } },
        { batchIds: { $exists: false } },
        { batchId: null },
        { batchId: { $exists: false } }
      ];
    }
  } else if (reqUser.role === 'teacher') {
    const BatchModel = require('../batches/batches.model');
    const teacherBatches = await BatchModel.find({
      instituteId: reqUser.instituteId,
      $or: [{ batchTeacherId: reqUser.userId }, { teachers: reqUser.userId }]
    });
    
    if (teacherBatches && teacherBatches.length > 0) {
      const classIds = teacherBatches.map(c => c._id);
      
      if (filters.batchId && filters.batchId !== 'all') {
        // Teacher requested a specific batch. Ensure they own it.
        if (!classIds.some(id => id.toString() === filters.batchId.toString())) {
          return []; // Return empty if they request a batch they don't own
        }
        query.$or = [
          { batchIds: filters.batchId },
          { batchId: filters.batchId }
        ];
      } else {
        // Teacher requested all batches. Only show materials for their batches.
        query.$or = [
          { batchIds: { $in: classIds } },
          { batchId: { $in: classIds } }
        ];
      }
    } else {
      // Teacher has no batches, show no materials
      return [];
    }
  } else if (filters.batchId && filters.batchId !== 'all') {
    query.$or = [
      { batchIds: filters.batchId },
      { batchId: filters.batchId }
    ];
  }
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;

  return await Resource.find(query)
    .populate('batchIds', 'name')
    .populate('batchId', 'name')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 });
};

exports.deleteResource = async (reqUser, resourceId) => {
  const resource = await Resource.findOneAndDelete({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');
  return resource;
};

exports.updateResource = async (reqUser, resourceId, payload) => {
  const resource = await Resource.findOne({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');
  
  if (payload.batchIds !== undefined) {
    resource.batchIds = payload.batchIds;
    // For cleanup/consistency, if they are setting batchIds, we can clear batchId
    resource.batchId = undefined;
  } else {
    if (payload.batchId === null) {
      resource.batchId = null; // clear batch if moved to 'All Batches'
    } else if (payload.batchId) {
      resource.batchId = payload.batchId;
    }
  }
  
  if (payload.title && payload.title !== resource.title) {
    if (resource.type === 'FOLDER') {
      const oldFolderFullPath = `${resource.folderPath}${resource.title}/`;
      const newFolderFullPath = `${resource.folderPath}${payload.title}/`;
      
      const children = await Resource.find({ 
        instituteId: reqUser.instituteId,
        folderPath: new RegExp('^' + oldFolderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      });
      
      for (let child of children) {
         child.folderPath = child.folderPath.replace(oldFolderFullPath, newFolderFullPath);
         await child.save();
      }
    }
    resource.title = payload.title;
  }
  
  if (payload.folderPath !== undefined) resource.folderPath = payload.folderPath;
  
  if (payload.isActive !== undefined) {
    resource.isActive = payload.isActive;
    
    if (resource.type === 'FOLDER') {
      const folderFullPath = `${resource.folderPath}${resource.title}/`;
      await Resource.updateMany(
        { 
          instituteId: reqUser.instituteId,
          folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
        },
        { isActive: payload.isActive }
      );
    }
  }
  
  return await resource.save();
};
