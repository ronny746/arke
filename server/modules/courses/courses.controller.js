const CourseService = require('./courses.service');
const { successResponse } = require('../../common/responses');

exports.createCourse = async (req, res, next) => {
  try {
    const data = await CourseService.createCourse(req.user, req.body);
    return successResponse(res, 'Course created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const data = await CourseService.getCourses(req.user, req.query);
    return successResponse(res, 'Courses retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const data = await CourseService.getCourseById(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Course not found' });
    return successResponse(res, 'Course retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const data = await CourseService.updateCourse(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Course not found' });
    return successResponse(res, 'Course updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const data = await CourseService.deleteCourse(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Course not found' });
    return successResponse(res, 'Course deleted successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.enrollCourse = async (req, res, next) => {
  try {
    const data = await CourseService.enrollCourse(req.params.id, req.user, req.body);
    return successResponse(res, 'Enrolled successfully', data);
  } catch (error) {
    next(error);
  }
};
