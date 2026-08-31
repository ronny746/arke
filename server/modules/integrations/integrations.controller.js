const IntegrationsService = require('./integrations.service');
const { successResponse } = require('../../common/responses');

exports.configureIntegration = async (req, res, next) => {
  try {
    const data = await IntegrationsService.configureIntegration(req.user, req.body);
    return successResponse(res, 'Integration configured successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getIntegrations = async (req, res, next) => {
  try {
    const data = await IntegrationsService.getIntegrations(req.user);
    return successResponse(res, 'Integrations retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
