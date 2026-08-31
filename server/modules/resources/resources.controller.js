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
