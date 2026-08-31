const AuthService = require('./auth.service');
const { successResponse, errorResponse } = require('../../common/responses');

exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const data = await AuthService.login(email, password, role);
    return successResponse(res, `Login successful for portal: ${data.user.role}`, data);
  } catch (error) {
    if (error.message.includes('Invalid email') || error.message.includes('password') || error.message.includes('portal')) {
      return errorResponse(res, error.message, null, 401);
    }
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // req.user contains the decoded JWT
    return successResponse(res, 'Current user retrieved successfully', req.user);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.userId, oldPassword, newPassword);
    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    if (error.message.includes('Invalid old password')) {
      return errorResponse(res, error.message, null, 400);
    }
    next(error);
  }
};
