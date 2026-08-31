const Exam = require('./exam.model');
const ExamQuestion = require('./exam-question.model');
const ExamService = require('./exam.service');

const calculateAnalysisData = (submission, questions) => {
  let totalMarks = 0;
  let score = 0;
  let subjectStats = {};
  let topicStats = {};
  let difficultyStats = {
    Easy: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 },
    Medium: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 },
    Hard: { totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, totalMarks: 0, score: 0 }
  };

  const detailedQuestions = questions.map(q => {
    const qObj = q.toObject();
    const userAns = submission.answers && submission.answers.find(a => a?.questionId && q?._id && a.questionId?.toString() === q._id?.toString());
    
    // Initialize Subject stats
    const subject = q.subject?.name || 'General';
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
    const topic = q.topic?.name || 'General';
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

    totalMarks += q.marks || 0;
    qObj.userAnswer = userAns || null;
    let isCorrect = false;
    let marksObtained = 0;

    if (userAns && userAns.status !== 'NOT_ANSWERED') {
      subjectStats[subject].attempted++;
      topicStats[topic].attempted++;
      difficultyStats[diff].attempted++;
      
      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt && userAns.selectedOptionId && correctOpt._id?.toString() === userAns.selectedOptionId?.toString()) {
          isCorrect = true;
        }
      } else {
        // Subjective manual grading check (if grading exists)
        if (userAns.marksObtained === q.marks) isCorrect = true;
      }

      if (isCorrect) {
        subjectStats[subject].correct++;
        subjectStats[subject].score += q.marks || 0;

        topicStats[topic].correct++;
        topicStats[topic].score += q.marks || 0;

        difficultyStats[diff].correct++;
        difficultyStats[diff].score += q.marks || 0;

        score += q.marks || 0;
        marksObtained = q.marks || 0;
      } else {
        subjectStats[subject].wrong++;
        subjectStats[subject].score -= q.negativeMarks || 0;

        topicStats[topic].wrong++;
        topicStats[topic].score -= q.negativeMarks || 0;

        difficultyStats[diff].wrong++;
        difficultyStats[diff].score -= q.negativeMarks || 0;

        score -= q.negativeMarks || 0;
        marksObtained = -(q.negativeMarks || 0);
      }
    }

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

  return {
    subjectStats,
    topicStats,
    difficultyStats,
    detailedQuestions,
    totalMarks,
    score
  };
};

exports.createExam = async (req, res) => {
  try {
    const { title, description, examType, assignedClasses, settings, security } = req.body;
    
    const exam = new Exam({
      title,
      description,
      examType,
      assignedClasses,
      settings,
      security,
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
    const { title, description, examType, assignedClasses, settings, security, status } = req.body;
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, institute: req.user.instituteId },
      { title, description, examType, assignedClasses, settings, security, status },
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

    if (req.user.role === 'teacher') {
      const AcademicClass = require('../academic-classes/academic-classes.model');
      const ClassSchedule = require('../classes-schedule/classes-schedule.model');
      
      const classTeacherDocs = await AcademicClass.find({ classTeacherId: req.user.userId }).select('_id');
      const classTeacherIds = classTeacherDocs.map(doc => doc._id);

      const scheduleDocs = await ClassSchedule.find({ teacherId: req.user.userId }).select('classId');
      const scheduledClassIds = scheduleDocs.map(doc => doc.classId);

      const allowedClassIds = [...new Set([...classTeacherIds, ...scheduledClassIds].map(id => id.toString()))];

      filter.assignedClasses = { $in: allowedClassIds };
    }

    console.log("TEACHER EXAM FILTER:", JSON.stringify(filter));
    const exams = await Exam.find(filter)
      .populate('assignedClasses', 'name section')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamDetails = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('assignedClasses', 'name section');
      
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
      data: questions
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
      message: 'Questions updated successfully'
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

    const submissions = await ExamSubmission.find({ exam: examId })
      .populate('student', 'firstName lastName email profilePicture metadata')
      .sort({ updatedAt: -1 });

    // Fetch the latest snapshot for each student
    const data = await Promise.all(submissions.map(async (sub) => {
      const latestLog = await ProctoringLog.findOne({ submission: sub._id })
        .sort({ timestamp: -1 })
        .select('snapshotUrl timestamp type');
      
      return {
        student: sub.student,
        publicUser: sub.publicUser,
        status: sub.status,
        violations: sub.violations,
        startTime: sub.startTime,
        endTime: sub.endTime,
        score: sub.score,
        latestSnapshot: latestLog ? latestLog.snapshotUrl : null,
        lastSnapshotTime: latestLog ? latestLog.timestamp : null
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
    const AcademicClass = require('../academic-classes/academic-classes.model');
    const studentClasses = await AcademicClass.find({ students: req.user.userId }).select('_id');
    const classIds = studentClasses.map(c => c._id);

    const exams = await Exam.find({
      institute: req.user.instituteId,
      status: 'PUBLISHED',
      assignedClasses: { $in: classIds }
    })
    .select('title settings security status totalQuestions totalMarks examType assignedClasses')
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
    const AcademicClass = require('../academic-classes/academic-classes.model');
    const ExamSubmission = require('./exam-submission.model');

    const parentUser = await User.findById(req.user.userId).populate('childrenIds', 'firstName lastName');
    if (!parentUser || !parentUser.childrenIds || parentUser.childrenIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const children = parentUser.childrenIds;
    const childIds = children.map(c => c._id);

    // Find all classes any of the children are enrolled in
    const studentClasses = await AcademicClass.find({ students: { $in: childIds } }).select('_id students');
    const classIds = studentClasses.map(c => c._id);

    // Find exams assigned to these classes
    const exams = await Exam.find({
      institute: req.user.instituteId,
      status: 'PUBLISHED',
      assignedClasses: { $in: classIds }
    })
    .select('title settings security status totalQuestions totalMarks examType assignedClasses')
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
        exam.assignedClasses && exam.assignedClasses.some(ac => ac && classesForChild.includes(ac.toString()))
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

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: submission.totalTimeTaken || 0,
        submittedAt: submission.endTime || submission.updatedAt,
        totalMarks: analysis.totalMarks,
        score: analysis.score
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

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: submission.totalTimeTaken || 0,
        submittedAt: submission.endTime || submission.updatedAt,
        totalMarks: analysis.totalMarks,
        score: analysis.score
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

    // Fetch all questions with correct answers
    const questions = await ExamQuestion.find({ exam: examId })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort('order');

    const analysis = calculateAnalysisData(submission, questions);

    res.status(200).json({
      success: true,
      data: {
        submission,
        subjectStats: analysis.subjectStats,
        topicStats: analysis.topicStats,
        difficultyStats: analysis.difficultyStats,
        detailedQuestions: analysis.detailedQuestions,
        details: analysis.detailedQuestions,
        totalTime: submission.totalTimeTaken || 0,
        submittedAt: submission.endTime || submission.updatedAt,
        student: submission.student || submission.publicUser,
        totalMarks: analysis.totalMarks,
        score: analysis.score
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (!submission) {
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

    const questions = await ExamQuestion.find({ exam: examId }).select('-options.isCorrect -correctAnswerText').populate('subject', 'name').sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        submission,
        questions,
        settings: exam.settings,
        security: exam.security
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { questionId, selectedOptionId, status, violations } = req.body;
    const examId = req.params.id;
    const studentId = req.user.userId;
    const ExamSubmission = require('./exam-submission.model');

    const submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    if (!submission || submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid submission state' });
    }

    const ansIndex = submission.answers.findIndex(a => a?.questionId && a.questionId?.toString() === questionId?.toString());
    if (ansIndex !== -1) {
      submission.answers[ansIndex].selectedOptionId = selectedOptionId;
      submission.answers[ansIndex].status = status || 'ANSWERED';
    } else {
      submission.answers.push({
        questionId,
        selectedOptionId,
        status: status || 'ANSWERED'
      });
    }

    if (violations) {
      submission.violations = { ...submission.violations, ...violations };
    }

    await submission.save();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    submission.status = req.body.isAutoSubmit ? 'AUTO_SUBMITTED' : 'SUBMITTED';
    submission.endTime = new Date();

    const questions = await ExamQuestion.find({ exam: examId });
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    questions.forEach(q => {
      const studentAns = submission.answers.find(a => a?.questionId && q?._id && a.questionId?.toString() === q._id?.toString());
      if (!studentAns || !studentAns.selectedOptionId) {
        unattempted++;
      } else {
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt && studentAns.selectedOptionId && studentAns.selectedOptionId?.toString() === correctOpt._id?.toString()) {
          correct++;
          score += (q.marks || 4);
          studentAns.isCorrect = true;
          studentAns.marksObtained = (q.marks || 4);
        } else {
          wrong++;
          score -= (q.negativeMarks || 1);
          studentAns.isCorrect = false;
          studentAns.marksObtained = -(q.negativeMarks || 1);
        }
      }
    });

    submission.score = score;
    submission.totalCorrect = correct;
    submission.totalWrong = wrong;
    submission.totalUnattempted = unattempted;

    if (req.body.violations) {
      submission.violations = { ...submission.violations, ...req.body.violations };
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      data: submission
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
      .populate('student', 'firstName lastName email rollNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions
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
