const AcademicClassService = require('./academic-classes.service');
const { successResponse } = require('../../common/responses');

exports.createClass = async (req, res, next) => {
  try {
    const data = await AcademicClassService.createClass(req.user, req.body);
    return successResponse(res, 'Class created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getClasses = async (req, res, next) => {
  try {
    const data = await AcademicClassService.getClasses(req.user, req.query);
    return successResponse(res, 'Classes retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getMyClasses = async (req, res, next) => {
  try {
    const data = await AcademicClassService.getMyClasses(req.user);
    return successResponse(res, 'My classes retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getClassById = async (req, res, next) => {
  try {
    const data = await AcademicClassService.getClassById(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Class not found' });
    return successResponse(res, 'Class retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateClass = async (req, res, next) => {
  try {
    const data = await AcademicClassService.updateClass(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Class not found' });
    return successResponse(res, 'Class updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.assignToClass = async (req, res, next) => {
  try {
    const data = await AcademicClassService.assignToClass(req.params.id, req.body.userIds, req.body.roleInClass, req.user);
    return successResponse(res, 'Users assigned successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.joinClass = async (req, res, next) => {
  try {
    const data = await AcademicClassService.joinClass(req.body.classId, req.user);
    return successResponse(res, 'Successfully joined the class', data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    const data = await AcademicClassService.deleteClass(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Class not found' });
    return successResponse(res, 'Class deleted successfully', data);
  } catch (error) {
    next(error);
  }
};
