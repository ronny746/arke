const Exam = require('./exam.model');
const ExamQuestion = require('./exam-question.model');
const ExamService = require('./exam.service');
const { getTopicFlag } = require('../arke-portal/portal.rules');
const FlagService = require('../performance-flags/performance-flags.service');
const { createRemedialSessions } = require('../arke-portal/remedial.service');
const { gradeAnswer, findStudentAnswer, answerHasValue } = require('./answer-grading');
const { computeExpectedPercentile, resolveLevel, resolveConfig } = require('./jee-percentile');
const { weakestChapters, resultSummary, missingChapterIds } = require('./result-summary');
const { secondsLeftFor } = require('./attempt-time');
const { checkQuestions } = require('./question-check');
const { lowDataQuestion, wantsLowData, requestOrigin } = require('../media-img/low-data');

// questionImageUrl (set by the ARKE paper import) was never shown by the app
// or the web player, so graph/diagram questions had no picture. Put it into
// the question HTML as well; clients that already show the field skip an
// image whose URL is in the text.
const inlineQuestionImages = (qObj) => {
  if (!qObj) return qObj;
  const url = typeof qObj.questionImageUrl === 'string' ? qObj.questionImageUrl.trim() : '';
  const text = typeof qObj.questionText === 'string' ? qObj.questionText : '';
  if (url && !text.includes(url)) {
    qObj.questionText = `${text}<p><img src="${url.replace(/"/g, '&quot;')}" alt="Question figure" /></p>`;
  }
  return qObj;
};
exports.inlineQuestionImages = inlineQuestionImages;

const calculateAnalysisData = (submission, questions, averageTimeByQuestion = new Map()) => {
  let totalMarks = 0;
  let score = 0;
  let subjectStats = {};
  let topicStats = {};
  let difficultyStats = {
    Easy: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 },
    Medium: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 },
    Hard: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 }
  };
  let nestedStats = {};
  const timingStats = { recorded: 0, tooFast: 0, timeHeavy: 0, normal: 0, totalSeconds: 0 };

  const detailedQuestions = questions.map(q => {
    const qObj = q.toObject();
    const userAns = findStudentAnswer(submission.answers, q?._id);
    inlineQuestionImages(qObj);

    // Initialize Subject stats
    const subject = q.subject?.name || q.subjectName || 'General';
    if (!subjectStats[subject]) {
      subjectStats[subject] = {
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        totalMarks: 0,
        score: 0
      };
    }
    subjectStats[subject].totalQuestions++;
    subjectStats[subject].totalMarks += q.marks || 0;

    // Initialize Topic stats
    const topic = q.topic?.name || q.topicName || 'General';
    if (!topicStats[topic]) {
      topicStats[topic] = {
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        totalMarks: 0,
        score: 0
      };
    }
    topicStats[topic].totalQuestions++;
    topicStats[topic].totalMarks += q.marks || 0;

    // Initialize Difficulty stats
    const diff = q.difficulty || 'Medium';
    if (!difficultyStats[diff]) {
      difficultyStats[diff] = {
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        totalMarks: 0,
        score: 0
      };
    }
    difficultyStats[diff].totalQuestions++;
    difficultyStats[diff].totalMarks += q.marks || 0;

    // Initialize Nested stats (Subject -> Topic -> Difficulty)
    if (!nestedStats[subject]) nestedStats[subject] = {};
    if (!nestedStats[subject][topic]) nestedStats[subject][topic] = {};
    if (!nestedStats[subject][topic][diff]) {
      nestedStats[subject][topic][diff] = {
        totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0
      };
    }
    nestedStats[subject][topic][diff].totalQuestions++;
    nestedStats[subject][topic][diff].totalMarks += q.marks || 0;

    const qMarks = q.marks !== undefined && q.marks !== null ? q.marks : 4;
    const qNegativeMarks = q.negativeMarks !== undefined && q.negativeMarks !== null ? q.negativeMarks : 1;

    totalMarks += qMarks;
    qObj.userAnswer = userAns || null;
    qObj.studentTimeSeconds = Number(userAns?.timeSpentSeconds || 0);
    qObj.averageTimeSeconds = Number(averageTimeByQuestion.get(String(q._id)) || 0);
    qObj.timingCategory = 'UNRECORDED';
    // Shared with submitExam (answer-grading.js). A question only marked for
    // review, with no value, is not attempted.
    const { attempted, isCorrect } = gradeAnswer(q, userAns);
    let marksObtained = 0;

    if (attempted) {
      subjectStats[subject].attempted++;
      topicStats[topic].attempted++;
      difficultyStats[diff].attempted++;
      nestedStats[subject][topic][diff].attempted++;

      if (isCorrect) {
        subjectStats[subject].correct++;
        subjectStats[subject].score += qMarks;

        topicStats[topic].correct++;
        topicStats[topic].score += qMarks;

        difficultyStats[diff].correct++;
        difficultyStats[diff].score += qMarks;
        
        nestedStats[subject][topic][diff].correct++;
        nestedStats[subject][topic][diff].score += qMarks;

        score += qMarks;
        marksObtained = qMarks;
      } else {
        subjectStats[subject].wrong++;
        subjectStats[subject].score -= qNegativeMarks;

        topicStats[topic].wrong++;
        topicStats[topic].score -= qNegativeMarks;

        difficultyStats[diff].wrong++;
        difficultyStats[diff].score -= qNegativeMarks;
        
        nestedStats[subject][topic][diff].wrong++;
        nestedStats[subject][topic][diff].score -= qNegativeMarks;

        score -= qNegativeMarks;
        marksObtained = -qNegativeMarks;
      }
    }

    const recordedSeconds = qObj.studentTimeSeconds;
    if (recordedSeconds > 0) {
      timingStats.recorded++;
      timingStats.totalSeconds += recordedSeconds;
      if (attempted && recordedSeconds < 10) {
        qObj.timingCategory = 'TOO_FAST';
        timingStats.tooFast++;
      } else if (recordedSeconds > 300) {
        qObj.timingCategory = 'TIME_HEAVY';
        timingStats.timeHeavy++;
      } else {
        qObj.timingCategory = 'NORMAL';
        timingStats.normal++;
      }
    }
    
    qObj.attempted = attempted;
    qObj.isCorrect = isCorrect;
    qObj.marksObtained = marksObtained;
    return qObj;
  });

  // Calculate accuracies and weak/strong tags for topics
  for (let topic in topicStats) {
    const stats = topicStats[topic];
    stats.accuracy = stats.totalQuestions > 0 ? Math.round((stats.correct / stats.totalQuestions) * 100) : 0;
    if (stats.accuracy >= 70) {
      stats.status = 'Strong';
    } else if (stats.accuracy >= 50) {
      stats.status = 'Medium';
    } else {
      stats.status = 'Weak';
    }
  }

  // Calculate accuracies for difficulty levels
  for (let diff in difficultyStats) {
    const stats = difficultyStats[diff];
    stats.accuracy = stats.totalQuestions > 0 ? Math.round((stats.correct / stats.totalQuestions) * 100) : 0;
  }

  // Calculate accuracies for nested stats
  for (let subj in nestedStats) {
    for (let top in nestedStats[subj]) {
      for (let df in nestedStats[subj][top]) {
        const stats = nestedStats[subj][top][df];
        stats.accuracy = stats.totalQuestions > 0 ? Math.round((stats.correct / stats.totalQuestions) * 100) : 0;
      }
    }
  }

  return {
    subjectStats,
    topicStats,
    difficultyStats,
    nestedStats,
    detailedQuestions,
    totalMarks,
    score,
    timingStats: { ...timingStats, averageSeconds: timingStats.recorded > 0 ? Math.round(timingStats.totalSeconds / timingStats.recorded) : 0 }
  };
};

// Seconds the attempt took. totalTimeTaken was never stored, so the
// analysis always reported 0; derive it from the attempt start/end.
const getAttemptSeconds = (submission) => {
  if (Number(submission?.totalTimeTaken) > 0) return Number(submission.totalTimeTaken);
  const start = submission?.startTime ? new Date(submission.startTime).getTime() : NaN;
  const end = submission?.endTime ? new Date(submission.endTime).getTime() : NaN;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? Math.round((end - start) / 1000) : 0;
};
exports.getAttemptSeconds = getAttemptSeconds;

// Results (correct answers + solutions) stay hidden until the exam window
// ends when the exam is set not to show results right after submit, so a
// student who finished cannot pass answers to those still writing.
const resultsLockedUntil = (exam) => {
  if (!exam || exam.settings?.showResultsAfterSubmit !== false) return null;
  const end = exam.settings?.endTime ? new Date(exam.settings.endTime) : null;
  return end && end.getTime() > Date.now() ? end : null;
};
exports.resultsLockedUntil = resultsLockedUntil;

// --- Expected JEE Main percentile (jee-percentile.js) ---
const parseJeeLevel = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
};

const getJeePercentileConfig = async (instituteId) => {
  const SystemConfig = require('../system-config/system-config.model');
  const cfg = instituteId
    ? await SystemConfig.findOne({ instituteId }).select('jeePercentileConfig').lean()
    : null;
  return resolveConfig(cfg?.jeePercentileConfig);
};

const workOutExpectedPercentile = (exam, score, totalMarks, config) => {
  const level = resolveLevel(exam);
  return { level, percentile: computeExpectedPercentile({ score, totalMarks, level, ...config }) };
};

// The saved value (worked out on submit) wins; attempts from before this
// feature get it worked out the same way, so web and app always agree.
const expectedPercentileForResult = async (submission, exam, score, totalMarks) => {
  if (typeof submission?.expectedJeePercentile === 'number') {
    return { expectedJeePercentile: submission.expectedJeePercentile, jeeLevel: submission.expectedJeeLevel ?? resolveLevel(exam) };
  }
  const config = await getJeePercentileConfig(exam?.institute);
  const { level, percentile } = workOutExpectedPercentile(exam, score, totalMarks, config);
  return { expectedJeePercentile: percentile, jeeLevel: level };
};
exports._expectedPercentileForResult = expectedPercentileForResult;

// "Result in one screen": headline numbers + 3 weakest chapters, and the
// low-data image rewrite, added to every analysis response.
const resultExtras = async (req, submission, examDoc, analysis, jee) => {
  const ids = missingChapterIds(analysis.detailedQuestions);
  const chapterNames = new Map();
  if (ids.length) {
    const { QuestionChapter } = require('./category.model');
    const rows = await QuestionChapter.find({ _id: { $in: ids } }).select('name').lean();
    rows.forEach((r) => chapterNames.set(String(r._id), r.name));
  }
  if (wantsLowData(req)) {
    const origin = requestOrigin(req);
    analysis.detailedQuestions.forEach((q) => lowDataQuestion(q, origin));
  }
  return {
    summary: resultSummary({
      detailedQuestions: analysis.detailedQuestions,
      score: analysis.score,
      totalMarks: analysis.totalMarks,
      timeUsedSeconds: getAttemptSeconds(submission),
      durationMinutes: examDoc?.settings?.durationMinutes,
      expectedJeePercentile: jee.expectedJeePercentile,
    }),
    weakChapters: weakestChapters(analysis.detailedQuestions, chapterNames),
  };
};

const getQuestionAverageTimes = async (examId) => {
  const ExamSubmission = require('./exam-submission.model');
  const rows = await ExamSubmission.aggregate([
    { $match: { exam: new (require('mongoose').Types.ObjectId)(examId), status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } } },
    { $unwind: '$answers' },
    { $match: { 'answers.timeSpentSeconds': { $gt: 0 } } },
    { $group: { _id: '$answers.questionId', averageTimeSeconds: { $avg: '$answers.timeSpentSeconds' } } }
  ]);
  return new Map(rows.map(row => [String(row._id), Math.round(row.averageTimeSeconds)]));
};

exports.createExam = async (req, res) => {
  try {
    const { title, description, examType, assignedBatches, settings, security, accessMode, accessPrice, jeeLevel } = req.body;
    
    const exam = new Exam({
      title,
      jeeLevel: parseJeeLevel(jeeLevel) ?? resolveLevel({ title }),
      description,
      examType,
      assignedBatches,
      settings,
      security,
      accessMode: accessMode === 'FREE' ? 'FREE' : 'PAID',
      accessPrice: Number(accessPrice) || 0,
      status: 'PUBLISHED',
      institute: req.user.instituteId,
      createdBy: req.user.userId,
    });

    await exam.save();
    
    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const { title, description, examType, assignedBatches, settings, security, status, accessMode, accessPrice, jeeLevel } = req.body;
    const update = { title, description, examType, assignedBatches, settings, security, status, accessMode: accessMode === 'FREE' ? 'FREE' : 'PAID', accessPrice: Number(accessPrice) || 0 };
    // Saved percentiles keep the old level until the admin presses Re-run.
    if (parseJeeLevel(jeeLevel)) update.jeeLevel = parseJeeLevel(jeeLevel);
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, institute: req.user.instituteId },
      update,
      { new: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.status(200).json({ success: true, message: 'Exam updated successfully', data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    let filter = { institute: req.user.instituteId };

    // Let teachers see all exams in the institute (same as admin)
    // No additional filtering needed based on role

    console.log("TEACHER EXAM FILTER:", JSON.stringify(filter));
    const exams = await Exam.find(filter)
      .populate('assignedBatches', 'name section')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamDetails = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.instituteId })
      .populate('assignedBatches', 'name section');
      
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questions = await ExamQuestion.find({ exam: exam._id })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort({ order: 1 });

    res.status(200).json({ 
      success: true, 
      data: {
        exam,
        questions
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.parseWordFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No word file uploaded' });
    }

    // Call service to parse the buffer
    const questions = await ExamService.parseWordTemplate(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'File parsed successfully',
      data: questions,
      questionCheck: checkQuestions(questions),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error parsing word file: ' + error.message });
  }
};

exports.addQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const examId = req.params.id;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const { QuestionCategory, QuestionChapter, QuestionTopic } = require('./category.model');
    const instituteId = req.user.instituteId;
    const userId = req.user.userId;

    const docs = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { _id, id, createdAt, updatedAt, __v, ...rest } = q;
      
      // Determine Subject
      let subjectId = rest.subject || rest.subjectId;
      if (typeof subjectId === 'object' && subjectId !== null) {
        subjectId = subjectId._id || subjectId.id;
      }
      
      const subjectName = q.subjectName || (q.subject && typeof q.subject === 'object' ? q.subject.name : (typeof q.subject === 'string' ? q.subject : null)) || 'General';
      
      let subjectObj = null;
      if (subjectId && require('mongoose').Types.ObjectId.isValid(subjectId)) {
        subjectObj = await QuestionCategory.findById(subjectId);
      }
      if (!subjectObj) {
        subjectObj = await QuestionCategory.findOne({ name: subjectName, institute: instituteId });
        if (!subjectObj) {
          subjectObj = await QuestionCategory.create({ name: subjectName, institute: instituteId, createdBy: userId });
        }
      }

      // Determine Chapter
      let chapterId = rest.chapter || rest.chapterId;
      if (typeof chapterId === 'object' && chapterId !== null) {
        chapterId = chapterId._id || chapterId.id;
      }
      const chapterName = q.chapterName || (q.chapter && typeof q.chapter === 'object' ? q.chapter.name : (typeof q.chapter === 'string' ? q.chapter : null)) || 'General';
      
      let chapterObj = null;
      if (chapterId && require('mongoose').Types.ObjectId.isValid(chapterId)) {
        chapterObj = await QuestionChapter.findById(chapterId);
      }
      if (!chapterObj) {
        chapterObj = await QuestionChapter.findOne({ name: chapterName, subject: subjectObj._id });
        if (!chapterObj) {
          chapterObj = await QuestionChapter.create({ name: chapterName, subject: subjectObj._id, createdBy: userId });
        }
      }

      // Determine Topic
      let topicId = rest.topic || rest.topicId;
      if (typeof topicId === 'object' && topicId !== null) {
        topicId = topicId._id || topicId.id;
      }
      const topicName = q.topicName || (q.topic && typeof q.topic === 'object' ? q.topic.name : (typeof q.topic === 'string' ? q.topic : null)) || 'General';
      
      let topicObj = null;
      if (topicId && require('mongoose').Types.ObjectId.isValid(topicId)) {
        topicObj = await QuestionTopic.findById(topicId);
      }
      if (!topicObj) {
        topicObj = await QuestionTopic.findOne({ name: topicName, chapter: chapterObj._id, subject: subjectObj._id });
        if (!topicObj) {
          topicObj = await QuestionTopic.create({ name: topicName, chapter: chapterObj._id, subject: subjectObj._id, createdBy: userId });
        }
      }

      const cleanOptions = rest.options?.map(opt => {
        const { _id, id, ...optRest } = opt;
        return optRest;
      }) || [];

      docs.push({
        ...rest,
        options: cleanOptions,
        subject: subjectObj._id,
        chapter: chapterObj._id,
        topic: topicObj._id,
        subjectName: subjectObj.name,
        chapterName: chapterObj.name,
        topicName: topicObj.name,
        difficulty: q.difficulty || 'Medium',
        exam: examId,
        order: i + 1,
      });
    }

    // Delete existing questions and insert new ones (full replace for simplicity)
    await ExamQuestion.deleteMany({ exam: examId });
    await ExamQuestion.insertMany(docs);

    // Update total marks and questions
    const totalMarks = docs.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    exam.totalQuestions = docs.length;
    exam.totalMarks = totalMarks;
    await exam.save();

    res.status(200).json({
      success: true,
      message: 'Questions updated successfully',
      // Upload summary for the admin: counts and any broken questions.
      questionCheck: checkQuestions(docs),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLiveMonitoringData = async (req, res) => {
  try {
    const examId = req.params.id;
    const ExamSubmission = require('./exam-submission.model');
    const ProctoringLog = require('./proctoring-log.model');
    const Exam = require('./exam.model');
    const ExamQuestion = require('./exam-question.model');

    const exam = await Exam.findById(examId);
    const totalQuestions = await ExamQuestion.countDocuments({ exam: examId });
    const durationMs = (exam?.settings?.durationMinutes || 0) * 60 * 1000;

    const submissions = await ExamSubmission.find({ exam: examId })
      .populate('student', 'firstName lastName email profilePicture metadata')
      .sort({ updatedAt: -1 });

    // Fetch the latest snapshot for each student
    const data = await Promise.all(submissions.map(async (sub) => {
      const latestLog = await ProctoringLog.findOne({ submission: sub._id })
        .sort({ timestamp: -1 })
        .select('snapshotUrl timestamp type');
      
      let timeLeft = 0;
      if (sub.status === 'IN_PROGRESS' && sub.startTime) {
         const elapsed = Date.now() - new Date(sub.startTime).getTime();
         timeLeft = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
      }

      return {
        student: sub.student,
        publicUser: sub.publicUser,
        status: sub.status,
        violations: sub.violations,
        startTime: sub.startTime,
        endTime: sub.endTime,
        score: sub.score,
        latestSnapshot: latestLog ? latestLog.snapshotUrl : null,
        lastSnapshotTime: latestLog ? latestLog.timestamp : null,
        progress: {
          attempted: sub.answers ? sub.answers.filter(a => ['ANSWERED', 'ANSWERED_AND_MARKED_FOR_REVIEW'].includes(a.status)).length : 0,
          skipped: sub.answers ? sub.answers.filter(a => a.status === 'NOT_ANSWERED').length : 0,
          markedForReview: sub.answers ? sub.answers.filter(a => ['MARKED_FOR_REVIEW', 'ANSWERED_AND_MARKED_FOR_REVIEW'].includes(a.status)).length : 0,
          totalVisited: sub.answers ? sub.answers.length : 0,
          totalQuestions,
          timeLeft
        }
      };
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Student APIs ---

exports.getStudentExams = async (req, res) => {
  try {
    const Batch = require('../batches/batches.model');
    const studentClasses = await Batch.find({ students: req.user.userId }).select('_id');
    const classIds = studentClasses.map(c => c._id);

    const exams = await Exam.find({
      institute: req.user.instituteId,
      status: 'PUBLISHED',
      assignedBatches: { $in: classIds }
    })
    .select('title settings security status totalQuestions totalMarks examType assignedBatches')
    .sort({ 'settings.startTime': 1 });

    const ExamSubmission = require('./exam-submission.model');
    const submissions = await ExamSubmission.find({ student: req.user.userId });
    
    const data = exams.map(exam => {
      const sub = submissions.find(s => s.exam.toString() === exam._id.toString());
      return {
        ...exam.toObject(),
        submissionStatus: sub ? sub.status : 'NOT_STARTED',
        score: sub ? sub.score : null
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getParentChildrenExams = async (req, res) => {
  try {
    const User = require('../users/users.model');
    const Batch = require('../batches/batches.model');
    const ExamSubmission = require('./exam-submission.model');

    const parentUser = await User.findById(req.user.userId).populate('childrenIds', 'firstName lastName');
    if (!parentUser || !parentUser.childrenIds || parentUser.childrenIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const children = parentUser.childrenIds;
    const childIds = children.map(c => c._id);

    // Find all classes any of the children are enrolled in
    const studentClasses = await Batch.find({ students: { $in: childIds } }).select('_id students');
    const classIds = studentClasses.map(c => c._id);

    // Find exams assigned to these classes
    const exams = await Exam.find({
      institute: req.user.instituteId,
      status: 'PUBLISHED',
      assignedBatches: { $in: classIds }
    })
    .select('title settings security status totalQuestions totalMarks examType assignedBatches')
    .sort({ 'settings.startTime': 1 });

    const submissions = await ExamSubmission.find({ student: { $in: childIds } });

    let finalData = [];

    // Map exams to each relevant child
    children.forEach(child => {
      // Find classes this specific child is in
      const classesForChild = studentClasses
        .filter(c => c.students && c.students.some(s => s && s.toString() === child._id.toString()))
        .map(c => c._id.toString());
      
      // Filter exams assigned to this child's classes
      const childExams = exams.filter(exam => 
        exam.assignedBatches && exam.assignedBatches.some(ac => ac && classesForChild.includes(ac.toString()))
      );

      childExams.forEach(exam => {
        const sub = submissions.find(s => 
          s && s.exam && exam && exam._id && 
          s.exam.toString() === exam._id.toString() && 
          s.student && child && child._id &&
          s.student.toString() === child._id.toString()
        );
        finalData.push({
          ...exam.toObject(),
          childId: child._id,
          childName: `${child.firstName} ${child.lastName}`,
          submissionStatus: sub ? sub.status : 'NOT_STARTED',
          score: sub ? sub.score : null
        });
      });
    });

    res.status(200).json({ success: true, data: finalData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getParentExamAnalysis = async (req, res) => {
  try {
    const examId = req.params.id;
    const childId = req.params.childId;
    const User = require('../users/users.model');
    
    // Verify child belongs to parent
    const parentUser = await User.findById(req.user.userId);
    if (!parentUser || !parentUser.childrenIds.some(id => id && id.toString() === childId.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to child data' });
    }

    const ExamSubmission = require('./exam-submission.model');
    const submission = await ExamSubmission.findOne({ 
      exam: examId, 
      student: childId,
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'No completed submission found for this exam' });
    }

    const examDoc = await Exam.findById(examId).select('settings title jeeLevel institute');
    const lockedUntil = resultsLockedUntil(examDoc);
    if (lockedUntil) {
      return res.status(403).json({ success: false, message: `Results will be available after ${lockedUntil.toISOString()}`, resultsAvailableAt: lockedUntil });
    }

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions, await getQuestionAverageTimes(examId));
    const jee = await expectedPercentileForResult(submission, examDoc, analysis.score, analysis.totalMarks);
    const extras = await resultExtras(req, submission, examDoc, analysis, jee);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: getAttemptSeconds(submission),
        submittedAt: submission.endTime || submission.updatedAt,
        totalMarks: analysis.totalMarks,
        score: analysis.score,
        timingStats: analysis.timingStats,
        expectedJeePercentile: jee.expectedJeePercentile,
        jeeLevel: jee.jeeLevel,
        summary: extras.summary,
        weakChapters: extras.weakChapters,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamAnalysis = async (req, res) => {
  try {
    const examId = req.params.id;
    const ExamSubmission = require('./exam-submission.model');
    
    // Fetch submission
    const submission = await ExamSubmission.findOne({ 
      exam: examId, 
      student: req.user.userId,
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'No completed submission found for this exam' });
    }

    const examDoc = await Exam.findById(examId).select('settings title jeeLevel institute');
    const lockedUntil = resultsLockedUntil(examDoc);
    if (lockedUntil) {
      return res.status(403).json({ success: false, message: `Results will be available after ${lockedUntil.toISOString()}`, resultsAvailableAt: lockedUntil });
    }

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions, await getQuestionAverageTimes(examId));
    const jee = await expectedPercentileForResult(submission, examDoc, analysis.score, analysis.totalMarks);
    const extras = await resultExtras(req, submission, examDoc, analysis, jee);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        nestedStats: analysis.nestedStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: getAttemptSeconds(submission),
        submittedAt: submission.endTime || submission.updatedAt,
        totalMarks: analysis.totalMarks,
        score: analysis.score,
        timingStats: analysis.timingStats,
        expectedJeePercentile: jee.expectedJeePercentile,
        jeeLevel: jee.jeeLevel,
        summary: extras.summary,
        weakChapters: extras.weakChapters,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminExamAnalysis = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const ExamSubmission = require('./exam-submission.model');
    const ExamQuestion = require('./exam-question.model');
    
    // Fetch submission
    const submission = await ExamSubmission.findById(submissionId).populate('student', 'firstName lastName rollNumber email profileImage');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const examId = submission.exam;
    const examDoc = await Exam.findById(examId).select('title jeeLevel institute settings');

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions, await getQuestionAverageTimes(examId));
    const jee = await expectedPercentileForResult(submission, examDoc, analysis.score, analysis.totalMarks);
    const extras = await resultExtras(req, submission, examDoc, analysis, jee);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        nestedStats: analysis.nestedStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: getAttemptSeconds(submission),
        submittedAt: submission.endTime || submission.updatedAt,
        student: submission.student || submission.publicUser,
        totalMarks: analysis.totalMarks,
        score: analysis.score,
        timingStats: analysis.timingStats,
        expectedJeePercentile: jee.expectedJeePercentile,
        jeeLevel: jee.jeeLevel,
        summary: extras.summary,
        weakChapters: extras.weakChapters,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Server-side exam timing (do not trust the device clock).
const EXAM_SUBMIT_GRACE_MS = 2 * 60 * 1000;

// Latest moment an attempt may still save answers: the earlier of
// (attempt start + duration) and the exam window end, plus a small grace.
const getAttemptDeadline = (settings = {}, submission = {}) => {
  const limits = [];
  const startedAt = submission.startTime ? new Date(submission.startTime).getTime() : NaN;
  const durationMs = Number(settings.durationMinutes) * 60 * 1000;
  if (Number.isFinite(startedAt) && durationMs > 0) limits.push(startedAt + durationMs);
  const windowEnd = settings.endTime ? new Date(settings.endTime).getTime() : NaN;
  if (Number.isFinite(windowEnd)) limits.push(windowEnd);
  return limits.length ? Math.min(...limits) + EXAM_SUBMIT_GRACE_MS : Infinity;
};
exports.getAttemptDeadline = getAttemptDeadline;

// The test rules (proctoring, warning limit, duration) without starting the
// clock, so the app can explain them and ask for the camera first: the
// permission pop-up then never eats exam time.
// Warning counters only ever go up: a reopened app starting from 0, or a late
// request, must never lower the count already recorded for this attempt.
const mergeViolations = (current, incoming) => {
  const base = current && typeof current.toObject === 'function' ? current.toObject() : { ...(current || {}) };
  const next = { ...base, ...(incoming || {}) };
  ['tabSwitches', 'fullScreenExits'].forEach((key) => {
    const a = Number(base[key]) || 0;
    const b = Number(incoming?.[key]);
    next[key] = Number.isFinite(b) ? Math.max(a, b) : a;
  });
  return next;
};
exports._mergeViolations = mergeViolations;

exports.getExamRules = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).select('status settings security title');
    if (!exam || exam.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Exam is not available' });
    }
    const ExamSubmission = require('./exam-submission.model');
    const submission = await ExamSubmission.findOne({ exam: exam._id, student: req.user.userId }).select('status startTime');
    return res.status(200).json({
      success: true,
      data: {
        settings: exam.settings,
        security: exam.security,
        started: Boolean(submission),
        submissionStatus: submission ? submission.status : 'NOT_STARTED',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.startExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.userId;
    const ExamSubmission = require('./exam-submission.model');

    const exam = await Exam.findById(examId);
    if (!exam || exam.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Exam is not available' });
    }

    let submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    // An open attempt is continued (e.g. after the app crashed), never restarted.
    const resumed = Boolean(submission);

    if (!submission) {
      const now = Date.now();
      const opensAt = exam.settings?.startTime ? new Date(exam.settings.startTime).getTime() : NaN;
      const closesAt = exam.settings?.endTime ? new Date(exam.settings.endTime).getTime() : NaN;
      if (Number.isFinite(opensAt) && now < opensAt) {
        return res.status(403).json({ success: false, message: 'This exam has not started yet' });
      }
      if (Number.isFinite(closesAt) && now > closesAt) {
        return res.status(403).json({ success: false, message: 'This exam has ended' });
      }
      submission = new ExamSubmission({
        exam: examId,
        student: studentId,
        status: 'IN_PROGRESS',
        startTime: new Date(),
        answers: []
      });
      await submission.save();
    } else if (submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }

    const lowData = wantsLowData(req);
    const origin = lowData ? requestOrigin(req) : null;
    const questions = (await ExamQuestion.find({ exam: examId }).select('-options.isCorrect -correctAnswerText').populate('subject', 'name').sort({ order: 1 }))
      .map((q) => {
        const qObj = inlineQuestionImages(q.toObject());
        return lowData ? lowDataQuestion(qObj, origin) : qObj;
      });

    res.status(200).json({
      success: true,
      data: {
        submission,
        questions,
        settings: exam.settings,
        security: exam.security,
        resumed,
        // Server clock, so a restarted app continues with the real time left.
        secondsLeft: secondsLeftFor(exam.settings, submission),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// App 1.0.7/1.0.8 (on the Play Store) send a typed integer answer under other
// keys: as `selectedOptionId` (not an option id, so Mongoose refused the
// whole save and the answer was graded as skipped), `answerText`,
// `integerAnswer` or `answer`. Move such values to `numericAnswer` (or
// `subjectiveAnswerText` for text), and drop any other non-ObjectId option ids.
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const TYPED_ALIASES = ['integerAnswer', 'numericalAnswer', 'answerText', 'answer', 'typedAnswer', 'value', 'textAnswer'];
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const normalizeAnswerPayload = (body = {}) => {
  const isId = (v) => v === null || OBJECT_ID_RE.test(String(v));
  const out = { ...(body || {}) };
  if (!isBlank(out.selectedOptionId) && !isId(out.selectedOptionId)) {
    if (isBlank(out.numericAnswer)) out.numericAnswer = String(out.selectedOptionId).trim();
    delete out.selectedOptionId;
  }
  if (isBlank(out.numericAnswer) && isBlank(out.subjectiveAnswerText)) {
    const alias = TYPED_ALIASES.map((k) => out[k]).find((v) => !isBlank(v) && typeof v !== 'object');
    if (alias !== undefined) {
      const text = String(alias).trim();
      if (!isNaN(Number(text))) out.numericAnswer = text;
      else out.subjectiveAnswerText = text;
    }
  }
  TYPED_ALIASES.forEach((k) => delete out[k]);
  if (out.selectedOptionId === '') out.selectedOptionId = null;
  if (Array.isArray(out.selectedOptionIds)) out.selectedOptionIds = out.selectedOptionIds.filter((v) => v && isId(v));
  if (typeof out.numericAnswer === 'number') {
    out.numericAnswer = Number.isFinite(out.numericAnswer) ? String(out.numericAnswer) : undefined;
  } else if (typeof out.numericAnswer === 'string') {
    out.numericAnswer = out.numericAnswer.trim();
  }
  return out;
};
exports.normalizeAnswerPayload = normalizeAnswerPayload;

const applyMissingAnswers = (submission, answers) => {
  if (!Array.isArray(submission.answers)) submission.answers = [];
  answers.slice(0, 500).forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const a = normalizeAnswerPayload(raw);
    if (!a.questionId) return;
    const incoming = {
      selectedOptionId: a.selectedOptionId,
      selectedOptionIds: a.selectedOptionIds,
      numericAnswer: a.numericAnswer,
      subjectiveAnswerText: a.subjectiveAnswerText,
    };
    if (!answerHasValue(incoming)) return;
    const existing = findStudentAnswer(submission.answers, a.questionId);
    if (existing && answerHasValue(existing)) return;
    if (existing) {
      Object.entries(incoming).forEach(([k, v]) => { if (v !== undefined) existing[k] = v; });
      existing.status = a.status || 'ANSWERED';
    } else {
      submission.answers.push({
        questionId: a.questionId,
        ...incoming,
        selectedOptionIds: incoming.selectedOptionIds || [],
        status: a.status || 'ANSWERED',
        timeSpentSeconds: 0,
      });
    }
  });
};
exports._applyMissingAnswers = applyMissingAnswers;

// Two saves for one question can overlap (the app's debounced autosave and
// Save & Next). The loser used to fail with a VersionError, which the app
// ignores, so the answer was lost. Retry it on the fresh document instead.
exports.saveAnswer = async (req, res) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const outcome = await saveAnswerOnce(req, res, attempt < 2);
    if (outcome !== RETRY) return outcome;
  }
};
const RETRY = Symbol('retry');

const saveAnswerOnce = async (req, res, canRetry) => {
  try {
    const { questionId, selectedOptionId, selectedOptionIds, numericAnswer, subjectiveAnswerText, status, violations, timeSpentSeconds } = normalizeAnswerPayload(req.body);
    const examId = req.params.id;
    const studentId = req.user.userId;
    const ExamSubmission = require('./exam-submission.model');

    const submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    if (!submission || submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid submission state' });
    }

    const examTiming = await Exam.findById(examId).select('settings');
    if (Date.now() > getAttemptDeadline(examTiming?.settings, submission)) {
      return res.status(403).json({ success: false, message: 'Time is over for this exam' });
    }

    // A warnings-only update (the app reports each time the student leaves
    // the test, so closing and reopening the app can't reset the count).
    if (!questionId) {
      if (!violations) return res.status(400).json({ success: false, message: 'questionId is required' });
      submission.violations = mergeViolations(submission.violations, violations);
      await submission.save();
      return res.status(200).json({ success: true });
    }

    const ansIndex = submission.answers.findIndex(a => a?.questionId && a.questionId?.toString() === questionId?.toString());
    if (ansIndex !== -1) {
      if (selectedOptionId !== undefined) submission.answers[ansIndex].selectedOptionId = selectedOptionId;
      if (selectedOptionIds !== undefined) submission.answers[ansIndex].selectedOptionIds = selectedOptionIds;
      if (numericAnswer !== undefined) submission.answers[ansIndex].numericAnswer = numericAnswer;
      if (subjectiveAnswerText !== undefined) submission.answers[ansIndex].subjectiveAnswerText = subjectiveAnswerText;
      submission.answers[ansIndex].status = status || 'ANSWERED';
      if (Number.isFinite(Number(timeSpentSeconds))) {
        submission.answers[ansIndex].timeSpentSeconds = Math.max(Number(submission.answers[ansIndex].timeSpentSeconds || 0), Math.max(0, Math.floor(Number(timeSpentSeconds))));
      }
    } else {
      submission.answers.push({
        questionId,
        selectedOptionId,
        selectedOptionIds: selectedOptionIds || [],
        numericAnswer,
        subjectiveAnswerText,
        status: status || 'ANSWERED',
        timeSpentSeconds: Number.isFinite(Number(timeSpentSeconds)) ? Math.max(0, Math.floor(Number(timeSpentSeconds))) : 0
      });
    }

    if (violations) {
      submission.violations = mergeViolations(submission.violations, violations);
    }

    await submission.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    if (canRetry && error?.name === 'VersionError') return RETRY;
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadSnapshot = async (req, res) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.userId;
    const ProctoringLog = require('./proctoring-log.model');
    const ExamSubmission = require('./exam-submission.model');

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No snapshot file found' });
    }

    const submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    if (!submission) {
      return res.status(400).json({ success: false, message: 'No submission found' });
    }

    const { s3Client, bucketName } = require('../../config/s3');
    const { Upload } = require('@aws-sdk/lib-storage');

    const fileName = `snapshots/student_${examId}_${submission._id}_${Date.now()}.jpg`;

    const s3Upload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype || 'image/jpeg',
        },
    });

    await s3Upload.done();

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    const log = new ProctoringLog({
      exam: examId,
      student: studentId,
      submission: submission._id,
      snapshotUrl: s3Url,
      type: req.body.type || 'PERIODIC_SNAPSHOT',
      timestamp: new Date()
    });

    await log.save();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const studentId = req.user.userId;
    const ExamSubmission = require('./exam-submission.model');

    const submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    if (!submission || submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid submission' });
    }

    // A late submit is still accepted (so the attempt gets graded), but it is
    // recorded as auto-submitted; answers saved after the deadline were refused.
    const examTiming = await Exam.findById(examId).select('settings');
    const deadline = getAttemptDeadline(examTiming?.settings, submission);
    const isLate = Date.now() > deadline;

    // The app also sends every answer it holds. Fill in any the server never
    // got (a save that failed offline, or one still in flight when Submit was
    // tapped). Answers the server already has always win, and nothing is taken
    // well after the deadline.
    if (Array.isArray(req.body.answers) && Date.now() <= deadline + 60 * 1000) {
      applyMissingAnswers(submission, req.body.answers);
    }

    submission.status = (req.body.isAutoSubmit || isLate) ? 'AUTO_SUBMITTED' : 'SUBMITTED';
    submission.endTime = new Date();

    if (req.body.timeSpentPerQuestion && typeof req.body.timeSpentPerQuestion === 'object') {
      submission.timeSpentPerQuestion = Object.fromEntries(
        Object.entries(req.body.timeSpentPerQuestion).map(([questionId, seconds]) => [
          questionId,
          Math.max(0, Math.floor(Number(seconds) || 0)),
        ]),
      );
      // Keep the embedded answer record in sync so existing analysis screens
      // can show per-question dwell time without a separate query.
      for (const [questionId, seconds] of Object.entries(req.body.timeSpentPerQuestion)) {
        const answer = submission.answers.find((item) => String(item.questionId) === String(questionId));
        if (answer) answer.timeSpentSeconds = Math.max(Number(answer.timeSpentSeconds || 0), Math.max(0, Math.floor(Number(seconds) || 0)));
      }
    }

    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name');
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    let paperTotalMarks = 0;
    const topicScoresByKey = new Map();

    questions.forEach(q => {
      const studentAns = findStudentAnswer(submission.answers, q?._id);
      // Same rules as the analysis (answer-grading.js), so the saved score
      // and the review agree. Marked-for-review with no value is unattempted.
      const graded = gradeAnswer(q, studentAns);
      const qMarks = q.marks !== undefined && q.marks !== null ? q.marks : 4;
      paperTotalMarks += Number(qMarks) || 0;
      if (!graded.attempted) {
        unattempted++;
        if (studentAns) {
          studentAns.isCorrect = false;
          studentAns.marksObtained = 0;
        }
      } else {
        if (graded.isCorrect) correct++;
        else wrong++;
        score += graded.marksObtained;
        studentAns.isCorrect = graded.isCorrect;
        studentAns.marksObtained = graded.marksObtained;
      }

      const subjectName = q.subject?.name || q.subjectName || 'General';
      const topicName = q.topic?.name || q.topicName || 'General';
      const key = `${subjectName}::${topicName}`;
      const topicScore = topicScoresByKey.get(key) || { subjectName, topicName, score: 0, totalMarks: 0 };
      topicScore.totalMarks += qMarks;
      topicScore.score += graded.marksObtained;
      topicScoresByKey.set(key, topicScore);
    });

    submission.score = score;
    submission.totalCorrect = correct;
    submission.totalWrong = wrong;
    submission.totalUnattempted = unattempted;

    // Expected JEE Main percentile: worked out here, on the server, and saved
    // with the attempt so the app and website always show the same number.
    const examForJee = await Exam.findById(examId).select('title jeeLevel').lean();
    const jee = workOutExpectedPercentile(
      examForJee, score, paperTotalMarks, await getJeePercentileConfig(req.user.instituteId),
    );
    submission.expectedJeePercentile = jee.percentile ?? undefined;
    submission.expectedJeeLevel = jee.level;

    if (req.body.violations) {
      submission.violations = mergeViolations(submission.violations, req.body.violations);
    }

    await submission.save();

    const topicScores = Array.from(topicScoresByKey.values()).map(topic => ({
      ...topic,
      // Negative marking must not turn a progress percentage into an invalid negative value.
      percentage: Math.max(0, Math.min(100, Number(((topic.score / topic.totalMarks) * 100).toFixed(2))))
    }));
    const SystemConfig = require('../system-config/system-config.model');
    const config = await SystemConfig.findOne({ instituteId: req.user.instituteId }).select('performanceSettings').lean();
    const thresholds = config?.performanceSettings;
    await FlagService.upsertFlags({
      instituteId: req.user.instituteId,
      studentId,
      examId,
      topicScores,
      thresholds,
      getTopicFlag,
      sourceType: 'EXAM'
    });

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /exams/:id/question-check — the upload summary for any paper.
exports.getQuestionCheck = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.instituteId }).select('_id title');
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    const questions = await ExamQuestion.find({ exam: exam._id })
      .select('type questionText questionImageUrl options correctAnswerText marks order')
      .sort({ order: 1 }).lean();
    res.status(200).json({ success: true, data: { examId: exam._id, title: exam.title, ...checkQuestions(questions) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin "Re-run": after a paper's level or the JEE table changes, work out
// every saved Expected JEE Main percentile of this paper again.
exports.recalculateJeePercentiles = async (req, res) => {
  try {
    const ExamSubmission = require('./exam-submission.model');
    const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.instituteId }).select('title jeeLevel').lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questions = await ExamQuestion.find({ exam: exam._id }).select('marks').lean();
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks ?? 4) || 0), 0);
    const config = await getJeePercentileConfig(req.user.instituteId);

    const submissions = await ExamSubmission.find({
      exam: exam._id,
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
    }).select('score').lean();

    const ops = submissions.map((sub) => {
      const { level, percentile } = workOutExpectedPercentile(exam, sub.score, totalMarks, config);
      return {
        updateOne: {
          filter: { _id: sub._id },
          update: percentile === null
            ? { $unset: { expectedJeePercentile: 1 }, $set: { expectedJeeLevel: level } }
            : { $set: { expectedJeePercentile: percentile, expectedJeeLevel: level } },
        },
      };
    });
    if (ops.length) await ExamSubmission.bulkWrite(ops);

    res.status(200).json({
      success: true,
      message: 'Expected JEE Main percentiles recalculated',
      data: { updated: ops.length, jeeLevel: resolveLevel(exam) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamSubmissions = async (req, res) => {
  try {
    const examId = req.params.id;
    const ExamSubmission = require('./exam-submission.model');
    
    // Fetch submissions, sort by latest first.
    // Populate student to get basic user details if they exist.
    const submissions = await ExamSubmission.find({ exam: examId })
      .populate('student', 'firstName lastName email rollNumber metadata')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportExamSubmissions = async (req, res) => {
  try {
    const examId = req.params.id;
    const ExamSubmission = require('./exam-submission.model');
    const Question = require('./exam-question.model');
    
    const submissions = await ExamSubmission.find({ exam: examId })
      .populate('student', 'firstName lastName email rollNumber metadata')
      .populate('publicUser', 'name email')
      .sort({ createdAt: -1 });

    // Fetch all questions for this exam and populate subject
    const questions = await Question.find({ exam: examId }).populate('subject', 'name');
    
    // Map question ID to subject name
    const questionSubjectMap = {};
    questions.forEach(q => {
      questionSubjectMap[q._id.toString()] = q.subject?.name || 'Unknown Subject';
    });

    const formattedData = submissions.map(sub => {
      const studentName = sub.student 
        ? `${sub.student.firstName} ${sub.student.lastName}`
        : (sub.publicUser ? `${sub.publicUser.name} (Public)` : 'Unknown');
      
      const rollNumber = sub.student?.metadata?.rollNo || sub.student?.rollNumber || '-';
      const email = sub.student?.email || sub.publicUser?.email || 'N/A';
      
      // Calculate subject-wise marks
      const subjectMarks = {};
      sub.answers.forEach(ans => {
        const subjectName = questionSubjectMap[ans.questionId.toString()] || 'Unknown Subject';
        if (!subjectMarks[subjectName]) {
          subjectMarks[subjectName] = 0;
        }
        subjectMarks[subjectName] += ans.marksObtained;
      });

      return {
        studentName,
        rollNumber,
        email,
        status: sub.status,
        score: sub.score,
        totalCorrect: sub.totalCorrect,
        totalWrong: sub.totalWrong,
        totalUnattempted: sub.totalUnattempted,
        tabSwitches: sub.violations?.tabSwitches || 0,
        fullScreenExits: sub.violations?.fullScreenExits || 0,
        ...subjectMarks
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubmissionSnapshots = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const ProctoringLog = require('./proctoring-log.model');
    
    // Get all snapshots for this submission
    const snapshots = await ProctoringLog.find({ submission: submissionId })
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: snapshots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
