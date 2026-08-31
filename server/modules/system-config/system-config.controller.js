const SystemConfigService = require('./system-config.service');
const { successResponse } = require('../../common/responses');

exports.updateConfig = async (req, res, next) => {
  try {
    const data = await SystemConfigService.updateConfig(req.user, req.body);
    return successResponse(res, 'System configuration updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getConfig = async (req, res, next) => {
  try {
    const data = await SystemConfigService.getConfig(req.user);
    return successResponse(res, 'System configuration retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
