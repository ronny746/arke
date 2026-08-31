const SystemConfig = require('./system-config.model');

exports.updateConfig = async (reqUser, payload) => {
  let query = reqUser?.instituteId ? { instituteId: reqUser.instituteId } : {};
  let config = await SystemConfig.findOne(query);

  if (!config) {
    // Attempt fallback query or create with default institute
    config = await SystemConfig.findOne();
  }

  if (config) {
    if (payload.neetExamConfig) {
      config.neetExamConfig = {
        ...config.neetExamConfig?.toObject?.() || config.neetExamConfig,
        ...payload.neetExamConfig
      };
    }
    if (payload.academicYear) config.academicYear = payload.academicYear;
    if (payload.activeTerm) config.activeTerm = payload.activeTerm;
    if (payload.preferences) config.preferences = payload.preferences;
    if (payload.authSettings) config.authSettings = payload.authSettings;
    if (payload.appUpdate) {
      config.appUpdate = {
        ...config.appUpdate?.toObject?.() || config.appUpdate,
        ...payload.appUpdate
      };
    }
    await config.save();
    return config;
  }

  let instId = reqUser?.instituteId;
  if (!instId) {
    const Institute = require('../institutes/institute.model');
    const inst = await Institute.findOne();
    instId = inst?._id;
  }

  return await SystemConfig.create({
    instituteId: instId,
    ...payload
  });
};

exports.getConfig = async (reqUser) => {
  let config = null;
  if (reqUser?.instituteId) {
    config = await SystemConfig.findOne({ instituteId: reqUser.instituteId });
  }
  if (!config) {
    config = await SystemConfig.findOne();
  }
  if (!config) {
    return {
      academicYear: "2025-2026",
      authSettings: { enableRollNumberLogin: true },
      neetExamConfig: {
        examTitle: "NEET UG 2026 COUNTDOWN",
        examDate: new Date("2026-05-03T10:00:00.000Z"),
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        subtitle: "Target NEET UG 2026 Examination"
      }
    };
  }
  return config;
};
