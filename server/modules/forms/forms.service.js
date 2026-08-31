const Form = require('./forms.model');
const crypto = require('crypto');

exports.createForm = async (reqUser, payload) => {
  // Generate a short 8-char unique ID for the public link
  const publicId = crypto.randomBytes(4).toString('hex');
  
  const form = new Form({
    instituteId: reqUser.instituteId,
    ...payload,
    publicId
  });

  return await form.save();
};

exports.getForms = async (reqUser) => {
  return await Form.find({ instituteId: reqUser.instituteId }).sort({ createdAt: -1 });
};

exports.getFormById = async (reqUser, formId) => {
  const form = await Form.findOne({ _id: formId, instituteId: reqUser.instituteId });
  if (!form) throw new Error('Form not found');
  return form;
};

exports.updateForm = async (reqUser, formId, payload) => {
  const form = await Form.findOneAndUpdate(
    { _id: formId, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  );
  if (!form) throw new Error('Form not found');
  return form;
};

// PUBLIC Access
exports.getPublicForm = async (publicId) => {
  const form = await Form.findOne({ publicId, isActive: true })
    .select('title description fields successMessage instituteId');
  if (!form) throw new Error('Form not found or is inactive');
  return form;
};
