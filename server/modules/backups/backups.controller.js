const BackupsService = require('./backups.service');
const { successResponse } = require('../../common/responses');

exports.requestBackup = async (req, res, next) => {
  try {
    const data = await BackupsService.requestBackup(req.user, req.body);
    return successResponse(res, 'Backup requested successfully', data, null, 202);
  } catch (error) {
    next(error);
  }
};

exports.getBackups = async (req, res, next) => {
  try {
    const data = await BackupsService.getBackups(req.user);
    return successResponse(res, 'Backups retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteBackup = async (req, res, next) => {
  try {
    await BackupsService.deleteBackup(req.params.id, req.user);
    return successResponse(res, 'Backup deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
