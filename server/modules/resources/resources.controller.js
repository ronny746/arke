const ResourcesService = require('./resources.service');
const { successResponse } = require('../../common/responses');

exports.createResource = async (req, res, next) => {
  try {
    const data = await ResourcesService.createResource(req.user, req.body);
    return successResponse(res, 'Resource uploaded successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getResources = async (req, res, next) => {
  try {
    const data = await ResourcesService.getResources(req.user, req.query);
    return successResponse(res, 'Resources retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteResource = async (req, res, next) => {
  try {
    await ResourcesService.deleteResource(req.user, req.params.id);
    return successResponse(res, 'Resource deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

exports.updateResource = async (req, res, next) => {
  try {
    const data = await ResourcesService.updateResource(req.user, req.params.id, req.body);
    return successResponse(res, 'Resource updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.assignCourses = async (req, res, next) => {
  try {
    const data = await ResourcesService.assignCourses(req.user, req.params.id, req.body.courseIds);
    return successResponse(res, 'Courses assigned successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.toggleUnlock = async (req, res, next) => {
  try {
    const data = await ResourcesService.toggleUnlock(req.user, req.params.id, req.body);
    return successResponse(res, 'Unlock status updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.streamPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { url } = req.query;
    const { buffer, contentType } = await ResourcesService.streamResourcePdf(req.user, id, url);
    
    res.set({
      'Content-Type': contentType.includes('pdf') ? 'application/pdf' : contentType,
      'Content-Disposition': 'inline; filename="document.pdf"',
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};
