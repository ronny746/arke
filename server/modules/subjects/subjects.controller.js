const SubjectService = require('./subjects.service');
const { successResponse } = require('../../common/responses');

exports.createSubject = async (req, res, next) => {
  try {
    const data = await SubjectService.createSubject(req.user, req.body);
    return successResponse(res, 'Subject created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getSubjects = async (req, res, next) => {
  try {
    const data = await SubjectService.getSubjects(req.user, req.query);
    return successResponse(res, 'Subjects retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const data = await SubjectService.getSubjectById(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Subject not found' });
    return successResponse(res, 'Subject retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const data = await SubjectService.updateSubject(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Subject not found' });
    return successResponse(res, 'Subject updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const data = await SubjectService.deleteSubject(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Subject not found' });
    return successResponse(res, 'Subject deleted successfully', data);
  } catch (error) {
    next(error);
  }
};
