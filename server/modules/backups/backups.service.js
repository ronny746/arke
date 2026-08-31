const Backup = require('./backups.model');

exports.requestBackup = async (reqUser, payload) => {
  const backup = new Backup({
    instituteId: reqUser.instituteId,
    requestedBy: reqUser.userId,
    type: payload.type || 'FULL'
  });

  await backup.save();

  // Here you would trigger the actual background worker/script to dump the database
  // e.g. publish event to RabbitMQ
  // For now, we simulate a fast backup completion for testing:
  setTimeout(async () => {
    backup.status = 'COMPLETED';
    backup.fileUrl = 'https://s3.amazonaws.com/backups/mock-backup.zip';
    backup.sizeBytes = 10485760; // 10MB
    await backup.save();
  }, 2000);

  return backup;
};

exports.getBackups = async (reqUser) => {
  return await Backup.find({ instituteId: reqUser.instituteId }).sort({ createdAt: -1 });
};

exports.deleteBackup = async (id, reqUser) => {
  // Only super admin inside their tenant can delete
  return await Backup.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};
