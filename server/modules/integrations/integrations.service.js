const Integration = require('./integrations.model');

exports.configureIntegration = async (reqUser, payload) => {
  return await Integration.findOneAndUpdate(
    { instituteId: reqUser.instituteId, provider: payload.provider },
    { ...payload },
    { new: true, upsert: true }
  );
};

exports.getIntegrations = async (reqUser) => {
  return await Integration.find({ instituteId: reqUser.instituteId }).select('-apiSecret');
};
