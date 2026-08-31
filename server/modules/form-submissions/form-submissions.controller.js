const FormSubmissionsService = require('./form-submissions.service');
const { successResponse } = require('../../common/responses');

exports.submitForm = async (req, res, next) => {
  try {
    const data = await FormSubmissionsService.submitForm(req.params.publicId, req.body);
    return successResponse(res, 'Form submitted successfully', data, 201);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getSubmissionsForForm = async (req, res, next) => {
  try {
    const data = await FormSubmissionsService.getSubmissionsForForm(req.user, req.params.formId);
    return successResponse(res, 'Submissions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const data = await FormSubmissionsService.updateStatus(req.user, req.params.id, req.body);
    return successResponse(res, 'Status updated successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
