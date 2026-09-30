const Resource = require('./resources.model');
const BatchModel = require('../batches/batches.model');
const CourseModel = require('../courses/courses.model');

async function getTeacherCourseAndBatchIds(reqUser) {
  const teacherCourses = await CourseModel.find({
    instituteId: reqUser.instituteId,
    $or: [{ faculties: reqUser.userId }, { 'subjects.teacherId': reqUser.userId }]
  }).select('_id');
  const teacherCourseIds = teacherCourses.map(c => c._id);

  const teacherBatches = await BatchModel.find({
    instituteId: reqUser.instituteId,
    $or: [
      { batchTeacherId: reqUser.userId },
      { teachers: reqUser.userId },
      { courseId: { $in: teacherCourseIds } }
    ]
  });
  const teacherBatchIds = teacherBatches.map(b => b._id);

  return { teacherCourseIds, teacherBatchIds, teacherBatches };
}

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
  if (!payload.fileUrl && payload.type === 'FOLDER') {
    delete payload.fileUrl;
  }
  
  if (reqUser.role === 'teacher') {
    const targetBatches = [];
    if (payload.batchId) targetBatches.push(payload.batchId.toString());
    if (payload.batchIds) payload.batchIds.forEach(id => targetBatches.push(id.toString()));
    
    if (targetBatches.length > 0) {
      const { teacherBatchIds } = await getTeacherCourseAndBatchIds(reqUser);
      const validIds = teacherBatchIds.map(id => id.toString());
      
      const isInvalid = targetBatches.some(id => !validIds.includes(id));
      if (isInvalid) {
        throw new Error('Forbidden: You can only upload materials to batches you are assigned to.');
      }
    }
  }

  // If this is created inside a folder, check if the parent folder has courseIds assigned
  let courseIds = payload.courseIds || [];
  if (courseIds.length === 0 && path !== '/') {
    const parentFolderParts = path.split('/').filter(Boolean);
    if (parentFolderParts.length > 0) {
      const parentFolderName = parentFolderParts[parentFolderParts.length - 1];
      const parentFolderPath = '/' + parentFolderParts.slice(0, -1).join('/') + (parentFolderParts.length > 1 ? '/' : '');
      const parentFolder = await Resource.findOne({
        instituteId: reqUser.instituteId,
        type: 'FOLDER',
        title: parentFolderName,
        folderPath: parentFolderPath
      });
      if (parentFolder && parentFolder.courseIds && parentFolder.courseIds.length > 0) {
        courseIds = parentFolder.courseIds;
      }
    }
  } else if (courseIds.length > 0 && path !== '/') {
    // Also make sure ancestor folders include these courseIds
    const parts = path.split('/').filter(Boolean);
    let cur = '/';
    for (const part of parts) {
      await Resource.updateOne(
        { instituteId: reqUser.instituteId, type: 'FOLDER', title: part, folderPath: cur },
        { $addToSet: { courseIds: { $each: courseIds } } }
      );
      cur += part + '/';
    }
  }
  
  const resource = new Resource({
    ...payload,
    courseIds,
    isBankMaterial: payload.isBankMaterial !== undefined ? payload.isBankMaterial : true,
    folderPath: path,
    instituteId: reqUser.instituteId,
    uploaderId: reqUser.userId
  });
  return await resource.save();
};

exports.getResources = async (reqUser, filters = {}) => {
  const query = { instituteId: reqUser.instituteId };

  if (reqUser.role === 'student') {
    query.isActive = { $ne: false };
    const studentBatches = await BatchModel.find({ students: reqUser.userId });
    const studentBatchIds = studentBatches.map(c => c._id);
    const studentCourseIds = studentBatches.map(c => c.courseId).filter(Boolean);

    if (studentBatchIds.length > 0) {
      query.$or = [
        // Materials unlocked for student's specific batch
        { unlockedBatches: { $in: studentBatchIds } },
        // Direct batch materials
        { batchIds: { $in: studentBatchIds } },
        { batchId: { $in: studentBatchIds } },
        // Legacy global materials
        {
          isBankMaterial: { $ne: true },
          courseIds: { $size: 0 },
          batchIds: { $size: 0 },
          batchId: null
        }
      ];
    } else {
      query.$or = [
        {
          isBankMaterial: { $ne: true },
          courseIds: { $size: 0 },
          batchIds: { $size: 0 },
          batchId: null
        }
      ];
    }
  } else if (reqUser.role === 'teacher') {
    const { teacherCourseIds, teacherBatchIds, teacherBatches } = await getTeacherCourseAndBatchIds(reqUser);
    
    if (filters.batchId && filters.batchId !== 'all') {
      const selectedBatch = teacherBatches.find(b => b._id.toString() === filters.batchId.toString());
      const selectedCourseId = selectedBatch?.courseId?._id || selectedBatch?.courseId;
      
      const batchOrConditions = [
        { batchIds: filters.batchId },
        { batchId: filters.batchId }
      ];
      if (selectedCourseId) {
        batchOrConditions.push({ courseIds: selectedCourseId });
      }
      query.$or = batchOrConditions;
    } else if (filters.courseId && filters.courseId !== 'all') {
      query.courseIds = filters.courseId;
    } else {
      // Return all materials for teacher's batches & courses
      query.$or = [
        { batchIds: { $in: teacherBatchIds } },
        { batchId: { $in: teacherBatchIds } },
        { courseIds: { $in: teacherCourseIds } }
      ];
    }
  } else {
    // Admin / Super Admin
    if (filters.courseId && filters.courseId !== 'all') {
      query.courseIds = filters.courseId;
    } else if (filters.batchId && filters.batchId !== 'all') {
      const batch = await BatchModel.findById(filters.batchId);
      const batchOrConditions = [
        { batchIds: filters.batchId },
        { batchId: filters.batchId }
      ];
      if (batch?.courseId) {
        batchOrConditions.push({ courseIds: batch.courseId });
      }
      query.$or = batchOrConditions;
    } else if (filters.section === 'global') {
      query.$or = [
        { isBankMaterial: false, batchId: null, batchIds: { $size: 0 }, courseIds: { $size: 0 } },
        { isBankMaterial: { $exists: false }, batchId: null, batchIds: { $size: 0 }, courseIds: { $size: 0 } }
      ];
    }
  }

  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;

  let resources = await Resource.find(query)
    .populate('courseIds', 'name tag color')
    .populate('batchIds', 'name section')
    .populate('batchId', 'name section')
    .populate('unlockedBatches', 'name section')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 });

  // For teachers and students, ensure all parent folders and all child items of matched folders are included!
  if (reqUser.role === 'teacher' || reqUser.role === 'student' || filters.courseId || filters.batchId) {
    const existingIds = new Set(resources.map(r => r._id.toString()));
    
    // 1. If any matched item is inside a folder path (e.g. /FolderA/SubB/), include all ancestor folders
    const neededFolderPaths = [];
    resources.forEach(r => {
      let p = r.folderPath || '/';
      if (p !== '/') {
        const parts = p.split('/').filter(Boolean);
        let cur = '/';
        for (const part of parts) {
          neededFolderPaths.push({ title: part, folderPath: cur });
          cur += part + '/';
        }
      }
    });

    if (neededFolderPaths.length > 0) {
      const orConditions = neededFolderPaths.map(nf => ({
        title: nf.title,
        folderPath: nf.folderPath,
        type: 'FOLDER'
      }));
      const ancestorFolders = await Resource.find({
        instituteId: reqUser.instituteId,
        $or: orConditions
      })
      .populate('courseIds', 'name tag color')
      .populate('batchIds', 'name section')
      .populate('batchId', 'name section')
      .populate('unlockedBatches', 'name section')
      .populate('subjectId', 'name');

      ancestorFolders.forEach(af => {
        if (!existingIds.has(af._id.toString())) {
          resources.push(af);
          existingIds.add(af._id.toString());
        }
      });
    }

    // 2. If any matched item is a FOLDER, include all child files/folders inside it
    const folderFullPaths = resources
      .filter(r => r.type === 'FOLDER')
      .map(f => {
        let p = f.folderPath || '/';
        if (!p.startsWith('/')) p = '/' + p;
        if (!p.endsWith('/')) p = p + '/';
        return p + f.title + '/';
      });

    if (folderFullPaths.length > 0) {
      const childQuery = {
        instituteId: reqUser.instituteId,
        $or: folderFullPaths.map(ffp => ({
          folderPath: new RegExp('^' + ffp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
        }))
      };
      if (reqUser.role === 'student') {
        childQuery.isActive = { $ne: false };
      }

      const childResources = await Resource.find(childQuery)
        .populate('courseIds', 'name tag color')
        .populate('batchIds', 'name section')
        .populate('batchId', 'name section')
        .populate('unlockedBatches', 'name section')
        .populate('subjectId', 'name');

      childResources.forEach(cr => {
        if (!existingIds.has(cr._id.toString())) {
          resources.push(cr);
          existingIds.add(cr._id.toString());
        }
      });
    }
  }

  // Mask sensitive direct storage/S3 URLs with the secure internal stream proxy URL
  return resources.map(r => {
    const doc = r.toObject ? r.toObject() : { ...r };
    if (doc.type !== 'FOLDER' && doc._id && doc.fileUrl) {
      const isExternalEmbedVideo = doc.type === 'VIDEO' && (
        doc.fileUrl.includes('youtube.com') || 
        doc.fileUrl.includes('youtu.be') || 
        doc.fileUrl.includes('vimeo.com')
      );
      if (!isExternalEmbedVideo) {
        doc.fileUrl = `/api/v1/resources/stream/${doc._id}`;
      }
    }
    return doc;
  });
};

exports.deleteResource = async (reqUser, resourceId) => {
  const resource = await Resource.findOneAndDelete({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');

  // If deleting a folder, also delete all child resources inside it
  if (resource.type === 'FOLDER') {
    const folderFullPath = `${resource.folderPath}${resource.title}/`;
    await Resource.deleteMany({
      instituteId: reqUser.instituteId,
      folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    });
  }

  return resource;
};

exports.assignCourses = async (reqUser, resourceId, courseIds) => {
  const resource = await Resource.findOne({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');

  resource.courseIds = courseIds || [];
  resource.isBankMaterial = true;
  await resource.save();

  // If this is a folder, cascade the course assignment to all children inside this folder
  if (resource.type === 'FOLDER') {
    const folderFullPath = `${resource.folderPath}${resource.title}/`;
    await Resource.updateMany(
      {
        instituteId: reqUser.instituteId,
        folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      },
      { courseIds: courseIds || [] }
    );
  } else {
    // If this is a file inside a folder, also ensure ancestor folders have these courseIds added
    let path = resource.folderPath || '/';
    if (path !== '/') {
      const parts = path.split('/').filter(Boolean);
      let cur = '/';
      for (const part of parts) {
        await Resource.updateOne(
          { instituteId: reqUser.instituteId, type: 'FOLDER', title: part, folderPath: cur },
          { $addToSet: { courseIds: { $each: courseIds || [] } } }
        );
        cur += part + '/';
      }
    }
  }

  return resource;
};

exports.toggleUnlock = async (reqUser, resourceId, { batchId, unlock }) => {
  const resource = await Resource.findOne({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');

  if (unlock) {
    await Resource.findByIdAndUpdate(resourceId, {
      $addToSet: { unlockedBatches: batchId }
    });
  } else {
    await Resource.findByIdAndUpdate(resourceId, {
      $pull: { unlockedBatches: batchId }
    });
  }

  // If this is a folder, cascade unlock/lock to all child resources
  if (resource.type === 'FOLDER') {
    const folderFullPath = `${resource.folderPath}${resource.title}/`;
    const childQuery = {
      instituteId: reqUser.instituteId,
      folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    };
    if (unlock) {
      await Resource.updateMany(childQuery, { $addToSet: { unlockedBatches: batchId } });
    } else {
      await Resource.updateMany(childQuery, { $pull: { unlockedBatches: batchId } });
    }
  }

  return await Resource.findById(resourceId)
    .populate('courseIds', 'name tag color')
    .populate('batchIds', 'name section')
    .populate('batchId', 'name section')
    .populate('unlockedBatches', 'name section');
};

exports.updateResource = async (reqUser, resourceId, payload) => {
  const resource = await Resource.findOne({ _id: resourceId, instituteId: reqUser.instituteId });
  if (!resource) throw new Error('Resource not found');
  
  if (payload.courseIds !== undefined) {
    resource.courseIds = payload.courseIds;
    if (resource.type === 'FOLDER') {
      const folderFullPath = `${resource.folderPath}${resource.title}/`;
      await Resource.updateMany(
        {
          instituteId: reqUser.instituteId,
          folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
        },
        { courseIds: payload.courseIds }
      );
    }
  }

  if (payload.isBankMaterial !== undefined) {
    resource.isBankMaterial = payload.isBankMaterial;
  }

  if (payload.unlockedBatches !== undefined) {
    resource.unlockedBatches = payload.unlockedBatches;
    if (resource.type === 'FOLDER') {
      const folderFullPath = `${resource.folderPath}${resource.title}/`;
      await Resource.updateMany(
        {
          instituteId: reqUser.instituteId,
          folderPath: new RegExp('^' + folderFullPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
        },
        { unlockedBatches: payload.unlockedBatches }
      );
    }
  }

  if (payload.batchIds !== undefined) {
    resource.batchIds = payload.batchIds;
    resource.batchId = undefined;
  } else {
    if (payload.batchId === null) {
      resource.batchId = null;
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

exports.streamResourcePdf = async (reqUser, resourceId, customUrl) => {
  const axios = require('axios');
  let targetUrl = customUrl;
  
  if (resourceId) {
    const resource = await Resource.findOne({
      _id: resourceId,
      instituteId: reqUser.instituteId
    });
    if (!resource) {
      const err = new Error('Resource not found');
      err.statusCode = 404;
      throw err;
    }
    targetUrl = resource.fileUrl;
  }

  if (!targetUrl) {
    const err = new Error('No file URL provided');
    err.statusCode = 400;
    throw err;
  }

  // Convert Google Drive view URLs to direct download/export link
  if (targetUrl.includes('drive.google.com')) {
    const driveMatch = targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      targetUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
  }

  const response = await axios.get(targetUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 30000,
    maxRedirects: 5
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || 'application/pdf'
  };
};
