const SystemConfig = require('./system-config.model');

exports.updateConfig = async (reqUser, payload) => {
  return await SystemConfig.findOneAndUpdate(
    { instituteId: reqUser.instituteId },
    { ...payload },
    { new: true, upsert: true }
  );
};

exports.getConfig = async (reqUser) => {
  return await SystemConfig.findOne({ instituteId: reqUser.instituteId });
};
