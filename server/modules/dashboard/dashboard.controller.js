const DashboardService = require('./dashboard.service');
const { successResponse } = require('../../common/responses');

exports.getDashboardData = async (req, res, next) => {
  try {
    const data = await DashboardService.getDashboardData(req.user);
    return successResponse(res, 'Dashboard data retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
