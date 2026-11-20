const crypto = require('crypto');
const mongoose = require('mongoose');
const Exam = require('../exams/exam.model');
const ExamQuestion = require('../exams/exam-question.model');
const Institute = require('../institutes/institutes.model');
const User = require('../users/users.model');

const safeEqual = (provided, expected) => {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const questionType = (question) => {
  if (question?.question_type || question?.type) return String(question.question_type || question.type).toUpperCase();
  if (Array.isArray(question?.options) && question.options.length) return 'MCQ';
  return question?.correct_answer !== undefined && question?.correct_answer !== null ? 'NUMERICAL' : 'SUBJECTIVE';
};

const normalizeQuestion = (question, examId, order) => {
  const options = Array.isArray(question.options)
    ? question.options.map((option) => ({
        text: option?.text || '',
        imageUrl: option?.image || option?.imageUrl || '',
        isCorrect: Boolean(question.correct_option && String(option?.key || '').toLowerCase() === String(question.correct_option).toLowerCase()),
      }))
    : [];

  return {
    exam: examId,
    type: questionType(question),
    subjectName: question.subject || 'General',
    chapterName: question.topic || 'General',
    topicName: question.sub_topic || 'General',
    questionText: question.question || question.questionText || '',
    questionImageUrl: question.question_image || question.questionImageUrl || '',
    options,
    correctAnswerText: question.correct_answer ?? question.correctAnswerText ?? '',
    explanation: question.solution || question.explanation || '',
    marks: Number(question.marks) || 4,
    negativeMarks: Number(question.negative_marks ?? question.negativeMarks ?? 1),
    order,
  };
};

exports.importPaper = async (req, res) => {
  try {
    const expectedSecret = process.env.ARKE_IMPORT_SHARED_SECRET;
    if (!expectedSecret) return res.status(503).json({ success: false, message: 'ARKE paper import is not configured.' });
    if (!safeEqual(req.header('x-arke-import-secret'), expectedSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid import credentials.' });
    }

    const { paper, sourcePaperId, sourceTenant = 'prepzo' } = req.body || {};
    if (!paper || !paper.title || !Array.isArray(paper.questions) || paper.questions.length === 0) {
      return res.status(400).json({ success: false, message: 'A paper title and at least one question are required.' });
    }

    const sourceId = String(sourcePaperId || paper.id || '').trim();
    if (!sourceId) return res.status(400).json({ success: false, message: 'sourcePaperId is required for idempotent import.' });

    let instituteId = process.env.ARKE_IMPORT_INSTITUTE_ID;
    if (!instituteId) {
      const institute = await Institute.findOne({ isActive: { $ne: false } }).sort({ createdAt: 1 }).select('_id');
      instituteId = institute?._id?.toString();
    }
    if (!instituteId || !mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(503).json({ success: false, message: 'ARKE import institute is not configured.' });
    }

    let createdBy = process.env.ARKE_IMPORT_CREATED_BY;
    if (!createdBy) {
      const admin = await User.findOne({ instituteId, role: 'admin', isActive: { $ne: false } }).select('_id');
      createdBy = admin?._id?.toString();
    }
    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(503).json({ success: false, message: 'ARKE import creator is not configured.' });
    }

    const existing = await Exam.findOne({ institute: instituteId, sourceSystem: 'arkebank', sourcePaperId: sourceId }).select('_id title totalQuestions totalMarks status');
    if (existing) {
      return res.status(200).json({ success: true, alreadyImported: true, exam: existing, message: 'Paper is already present in ARKE Exam Papers.' });
    }

    const now = new Date();
    const exam = await Exam.create({
      title: paper.title,
      description: paper.description || `Imported from ${sourceTenant}`,
      institute: instituteId,
      createdBy,
      examType: 'INTERNAL',
      status: 'DRAFT',
      sourceSystem: 'arkebank',
      sourcePaperId: sourceId,
      settings: {
        startTime: now,
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        durationMinutes: Number.parseInt(String(paper.timeAllowed || '60'), 10) || 60,
        passingMarks: 0,
        showResultsAfterSubmit: true,
      },
      security: { requireFullScreen: true, disableCopyPaste: true, maxTabSwitchesAllowed: 3, enableProctoring: false, proctoringIntervalSeconds: 5 },
      totalQuestions: paper.questions.length,
      totalMarks: paper.questions.reduce((sum, question) => sum + (Number(question.marks) || 4), 0),
    });

    try {
      await ExamQuestion.insertMany(paper.questions.map((question, index) => normalizeQuestion(question, exam._id, index + 1)));
    } catch (error) {
      await Exam.deleteOne({ _id: exam._id });
      throw error;
    }

    return res.status(201).json({ success: true, alreadyImported: false, exam, message: 'Paper imported into ARKE Exam Papers.' });
  } catch (error) {
    console.error('[ARKE IMPORT] Paper import failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Paper import failed.' });
  }
};
