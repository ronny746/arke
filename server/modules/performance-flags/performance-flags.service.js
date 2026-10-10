const PerformanceFlag = require('./performance-flags.model');

exports.upsertFlags = async ({ instituteId, studentId, examId, topicScores, thresholds, getTopicFlag, sourceType = 'EXAM', sessionId }) => {
  const operations = topicScores.map(topic => ({
    updateOne: {
      filter: { 
        studentId, 
        sourceType,
        subjectName: topic.subjectName, 
        topicName: topic.topicName,
        ...(sourceType === 'EXAM' && examId ? { examId } : {}),
        ...(sourceType === 'DPP' && sessionId ? { sessionId } : {})
      },
      update: {
        $set: {
          instituteId,
          sourceType,
          ...(examId ? { examId } : {}),
          ...(sessionId ? { sessionId } : {}),
          percentage: topic.percentage,
          flag: getTopicFlag ? getTopicFlag(topic.percentage, thresholds) : (topic.percentage >= 70 ? 'GREEN' : topic.percentage >= 40 ? 'YELLOW' : 'RED')
        }
      },
      upsert: true
    }
  }));
  if (operations.length) await PerformanceFlag.bulkWrite(operations);
  return PerformanceFlag.find({ studentId, ...(examId ? { examId } : {}) }).sort({ flag: 1, percentage: 1 });
};

// When a student completes a DPP, update DPP topic flags and improve matching weak topic flags!
exports.updateFlagsFromDpp = async (session) => {
  if (!session || !session.questions || session.questions.length === 0) return;

  const topicScoresMap = new Map();
  session.questions.forEach((q) => {
    const ans = (session.answers || []).find(a => String(a.questionId) === String(q.questionId));
    const sName = q.subjectName || session.filters?.subject || 'General';
    const tName = q.topicName || session.filters?.topic || (session.filters?.topics && session.filters.topics[0]) || 'General';
    const key = `${sName}:::${tName}`;
    if (!topicScoresMap.has(key)) {
      topicScoresMap.set(key, { subjectName: sName, topicName: tName, score: 0, totalMarks: 0 });
    }
    const tData = topicScoresMap.get(key);
    const qMarks = q.marks || 4;
    tData.totalMarks += qMarks;
    if (ans && ans.isCorrect) {
      tData.score += qMarks;
    } else if (ans && (ans.selectedOptionId && ans.status?.startsWith('ANSWERED'))) {
      tData.score -= (q.negativeMarks || 1);
    }
  });

  const topicScores = Array.from(topicScoresMap.values()).map(t => {
    const total = t.totalMarks > 0 ? t.totalMarks : 1;
    const clampedScore = Math.max(0, t.score);
    const pct = Math.max(0, Math.min(100, Math.round((clampedScore / total) * 100)));
    const flag = pct >= 70 ? 'GREEN' : pct >= 40 ? 'YELLOW' : 'RED';
    return {
      ...t,
      percentage: pct,
      flag
    };
  });

  // 1. Upsert topic health under sourceType: 'DPP'
  const dppOperations = topicScores.map(topic => ({
    updateOne: {
      filter: {
        studentId: session.student,
        sourceType: 'DPP',
        subjectName: topic.subjectName,
        topicName: topic.topicName
      },
      update: {
        $set: {
          instituteId: session.institute,
          sourceType: 'DPP',
          sessionId: session._id,
          percentage: topic.percentage,
          flag: topic.flag,
          remedialAttemptedAt: new Date()
        }
      },
      upsert: true
    }
  }));
  if (dppOperations.length) {
    await PerformanceFlag.bulkWrite(dppOperations);
  }

  // 2. Check and improve weak topic flags from EXAMs if the student improved
  for (const topic of topicScores) {
    const existingFlags = await PerformanceFlag.find({
      studentId: session.student,
      $or: [{ sourceType: 'EXAM' }, { sourceType: { $exists: false } }],
      subjectName: topic.subjectName,
      topicName: topic.topicName
    });

    for (const ef of existingFlags) {
      if (topic.percentage > ef.percentage || topic.percentage >= 40) {
        ef.percentage = Math.max(ef.percentage, topic.percentage);
        ef.flag = topic.flag;
        ef.remedialAttemptedAt = new Date();
        ef.remedialSessionId = session._id;
        await ef.save();
      }
    }
  }
};

exports.attachRemedialSessions = async ({ studentId, examId, sessions }) => {
  await Promise.all(sessions.map(session => PerformanceFlag.updateOne(
    { studentId, examId, topicName: session.filters.topic, flag: 'RED' },
    { $set: { remedialSessionId: session._id } }
  )));
};

exports.syncFlagsFromSubmissions = async (studentId) => {
  try {
    const ExamSubmission = require('../exams/exam-submission.model');
    const ExamQuestion = require('../exams/exam-question.model');
    const submissions = await ExamSubmission.find({
      student: studentId,
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
    }).lean();

    if (!submissions.length) return;

    const examIds = submissions.map(s => s.exam).filter(Boolean);
    const questions = await ExamQuestion.find({ exam: { $in: examIds } })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .lean();

    const qMap = new Map();
    questions.forEach(q => qMap.set(String(q._id), q));

    const topicScoresByKey = new Map();

    submissions.forEach(sub => {
      (sub.answers || []).forEach(ans => {
        const q = qMap.get(String(ans.questionId));
        if (!q) return;
        const sName = q.subject?.name || 'General';
        const tName = q.topic?.name || 'General';
        const key = `${sName}:::${tName}`;
        if (!topicScoresByKey.has(key)) {
          topicScoresByKey.set(key, { subjectName: sName, topicName: tName, score: 0, totalMarks: 0, instituteId: sub.instituteId });
        }
        const entry = topicScoresByKey.get(key);
        const marks = q.marks || 4;
        entry.totalMarks += marks;
        if (ans.isCorrect) {
          entry.score += marks;
        } else if (ans.status !== 'NOT_ANSWERED') {
          entry.score -= (q.negativeMarks || 1);
        }
      });
    });

    const operations = Array.from(topicScoresByKey.values()).map(item => {
      const total = item.totalMarks > 0 ? item.totalMarks : 1;
      const clampedScore = Math.max(0, item.score);
      const pct = Math.max(0, Math.min(100, Math.round((clampedScore / total) * 100)));
      const flag = pct >= 70 ? 'GREEN' : pct >= 40 ? 'YELLOW' : 'RED';
      return {
        updateOne: {
          filter: {
            studentId,
            sourceType: 'EXAM',
            subjectName: item.subjectName,
            topicName: item.topicName
          },
          update: {
            $set: {
              ...(item.instituteId ? { instituteId: item.instituteId } : {}),
              sourceType: 'EXAM',
              percentage: pct,
              flag
            }
          },
          upsert: true
        }
      };
    });

    if (operations.length) {
      await PerformanceFlag.bulkWrite(operations);
    }
  } catch (err) {
    console.error('Failed to sync flags from submissions:', err);
  }
};

exports.getMyFlags = async (studentId, filters = {}) => {
  const query = { studentId };
  if (filters.examId) query.examId = filters.examId;
  if (filters.subject && filters.subject !== 'ALL') {
    query.subjectName = { $regex: new RegExp(`^${filters.subject}$`, 'i') };
  }
  if (filters.sourceType) {
    if (filters.sourceType === 'EXAM') {
      query.$or = [{ sourceType: 'EXAM' }, { sourceType: { $exists: false } }];
    } else {
      query.sourceType = filters.sourceType;
    }
  }

  let flags = await PerformanceFlag.find(query)
    .populate({ path: 'examId', select: 'title', strictPopulate: false })
    .populate({ path: 'sessionId', select: 'title status score totalMarks', strictPopulate: false })
    .populate({ path: 'remedialSessionId', select: 'title status score totalMarks', strictPopulate: false })
    .sort({ createdAt: -1, percentage: 1 });

  // If no flags found for exam, auto-sync from any completed exam submissions
  if (flags.length === 0 && (!filters.sourceType || filters.sourceType === 'EXAM')) {
    await exports.syncFlagsFromSubmissions(studentId);
    flags = await PerformanceFlag.find(query)
      .populate({ path: 'examId', select: 'title', strictPopulate: false })
      .populate({ path: 'sessionId', select: 'title status score totalMarks', strictPopulate: false })
      .populate({ path: 'remedialSessionId', select: 'title status score totalMarks', strictPopulate: false })
      .sort({ createdAt: -1, percentage: 1 });
  }

  return flags;
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
