const PerformanceFlag = require('./performance-flags.model');

exports.upsertFlags = async ({ instituteId, studentId, examId, topicScores, thresholds, getTopicFlag }) => {
  const operations = topicScores.map(topic => ({
    updateOne: {
      filter: { studentId, examId, subjectName: topic.subjectName, topicName: topic.topicName },
      update: {
        $set: {
          instituteId,
          percentage: topic.percentage,
          flag: getTopicFlag(topic.percentage, thresholds)
        }
      },
      upsert: true
    }
  }));
  if (operations.length) await PerformanceFlag.bulkWrite(operations);
  return PerformanceFlag.find({ studentId, examId }).sort({ flag: 1, percentage: 1 });
};

exports.attachRemedialSessions = async ({ studentId, examId, sessions }) => {
  await Promise.all(sessions.map(session => PerformanceFlag.updateOne(
    { studentId, examId, topicName: session.filters.topic, flag: 'RED' },
    { $set: { remedialSessionId: session._id } }
  )));
};

exports.getMyFlags = async (studentId, filters = {}) => {
  const query = { studentId };
  if (filters.examId) query.examId = filters.examId;
  return PerformanceFlag.find(query).populate('examId', 'title').populate('remedialSessionId', 'title status score totalMarks').sort({ createdAt: -1, percentage: 1 });
};

exports.getChildFlags = async (parentId, childId, filters = {}) => {
  const User = require('../users/users.model');
  const parent = await User.findById(parentId).select('childrenIds');
  if (!parent?.childrenIds.some(id => String(id) === String(childId))) throw new Error('You are not authorized to view this student.');
  return exports.getMyFlags(childId, filters);
};

exports.getBatchFlags = async (teacherId, instituteId, batchId) => {
  const Batch = require('../batches/batches.model');
  const batch = await Batch.findOne({ _id: batchId, instituteId, $or: [{ batchTeacherId: teacherId }, { teachers: teacherId }] }).select('students');
  if (!batch) throw new Error('You are not assigned to this batch.');
  return PerformanceFlag.find({ studentId: { $in: batch.students } })
    .populate('studentId', 'firstName lastName metadata')
    .populate('remedialSessionId', 'status')
    .sort({ flag: 1, percentage: 1 });
};
