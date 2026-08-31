const FormsService = require('./forms.service');
const { successResponse } = require('../../common/responses');

exports.createForm = async (req, res, next) => {
  try {
    const data = await FormsService.createForm(req.user, req.body);
    return successResponse(res, 'Form created successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

exports.getForms = async (req, res, next) => {
  try {
    const data = await FormsService.getForms(req.user);
    return successResponse(res, 'Forms retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getFormById = async (req, res, next) => {
  try {
    const data = await FormsService.getFormById(req.user, req.params.id);
    return successResponse(res, 'Form retrieved successfully', data);
  } catch (error) {
    if (error.message === 'Form not found') return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.updateForm = async (req, res, next) => {
  try {
    const data = await FormsService.updateForm(req.user, req.params.id, req.body);
    return successResponse(res, 'Form updated successfully', data);
  } catch (error) {
    if (error.message === 'Form not found') return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

// PUBLIC Access
exports.getPublicForm = async (req, res, next) => {
  try {
    const data = await FormsService.getPublicForm(req.params.publicId);
    return successResponse(res, 'Form data retrieved', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
