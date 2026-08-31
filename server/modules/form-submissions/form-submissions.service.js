const FormSubmission = require('./form-submissions.model');
const Form = require('../forms/forms.model');

exports.submitForm = async (publicId, payload) => {
  // Find the form first to get its ID and instituteId
  const form = await Form.findOne({ publicId, isActive: true });
  if (!form) throw new Error('Form not found or is inactive');

  // We could add validation here to ensure required fields are present
  // but we'll trust the frontend for now, or the Joi schema handles basic shape.

  const submission = new FormSubmission({
    formId: form._id,
    instituteId: form.instituteId,
    data: payload.data,
    status: 'NEW'
  });

  return await submission.save();
};

exports.getSubmissionsForForm = async (reqUser, formId) => {
  // Ensure the form belongs to the institute
  const form = await Form.findOne({ _id: formId, instituteId: reqUser.instituteId });
  if (!form) throw new Error('Form not found');

  return await FormSubmission.find({ formId, instituteId: reqUser.instituteId })
    .populate('assignedTo', 'firstName lastName')
    .sort({ createdAt: -1 });
};

exports.updateStatus = async (reqUser, submissionId, payload) => {
  const submission = await FormSubmission.findOneAndUpdate(
    { _id: submissionId, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  ).populate('assignedTo', 'firstName lastName');

  if (!submission) throw new Error('Submission not found');
  return submission;
};
