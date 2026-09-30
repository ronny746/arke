const PracticeSession = require('./practice-session.model');
const QuestionBank = require('../exams/question-bank.model');
const mongoose = require('mongoose');

// Get available subjects, chapters, and topics for the student's institute
exports.getFilters = async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    
    // Aggregate to get unique subjects, chapters, topics, and difficulties with their counts
    const filterCounts = await QuestionBank.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      { $unwind: "$questions" },
      { $group: {
          _id: {
            subject: "$questions.subjectName",
            chapter: "$questions.chapterName",
            topic: "$questions.topicName",
            difficulty: "$questions.difficulty"
          },
          count: { $sum: 1 }
      }}
    ]);
    
    // Fetch valid categories (folders) to filter out deleted ones
    const { QuestionCategory } = require('../exams/category.model');
    const validCategories = await QuestionCategory.find({ institute: req.user.instituteId }).select('name').lean();
    const validSubjectNames = new Set(validCategories.map(c => c.name));

    // Process the flat counts into a structured format for the frontend
    const subjectsMap = {};
    const rawCounts = [];

    filterCounts.forEach(f => {
      const subj = f._id.subject || 'General';
      
      // Skip deleted subjects (if it's not 'General' and doesn't exist in active categories)
      if (subj !== 'General' && !validSubjectNames.has(subj)) {
        return;
      }

      const chap = f._id.chapter || 'General';
      const top = f._id.topic || 'General';
      const diff = f._id.difficulty || 'Medium';
      const count = f.count;
      
      rawCounts.push({ subject: subj, chapter: chap, topic: top, difficulty: diff, count });

      if (!subjectsMap[subj]) {
        subjectsMap[subj] = { subject: subj, topics: new Set(), chaptersMap: {} };
      }
      
      if (!subjectsMap[subj].chaptersMap[chap]) {
        subjectsMap[subj].chaptersMap[chap] = new Set();
      }

      if (top) {
        subjectsMap[subj].topics.add(top);
        subjectsMap[subj].chaptersMap[chap].add(top);
      }
    });
    
    const result = Object.values(subjectsMap).map(s => ({
      subject: s.subject,
      topics: Array.from(s.topics),
      chapters: Object.keys(s.chaptersMap).map(c => ({
        chapter: c,
        topics: Array.from(s.chaptersMap[c])
      }))
    }));
    
    res.status(200).json({ success: true, data: result, counts: rawCounts });
  } catch (error) {
    console.error("Error fetching practice filters:", error);
    res.status(500).json({ success: false, message: 'Server error fetching filters.' });
  }
};

// Generate a new DPP or Practice Session
// Generate a new DPP or Practice Session
exports.generateSession = async (req, res) => {
  try {
    const { sessionType = 'DPP', subject, chapter, topic, topics, subjectTopicPairs, difficulty, numberOfQuestions, linkedExamId, parentSessionId, studentId: customStudentId, targetStudentId, flagId, flagIds } = req.body;
    const instituteId = req.user.instituteId;
    
    let studentId = req.user.userId;
    if ((req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'ADMIN' || req.user.role === 'TEACHER') && (customStudentId || targetStudentId)) {
      studentId = customStudentId || targetStudentId;
    }

    if (!sessionType || !['DPP', 'PRACTICE'].includes(sessionType)) {
      return res.status(400).json({ success: false, message: 'Invalid session type.' });
    }

    // Collect all requested topics
    let requestedTopics = [];
    if (Array.isArray(topics) && topics.length > 0) {
      requestedTopics = topics.filter(Boolean);
    } else if (Array.isArray(subjectTopicPairs) && subjectTopicPairs.length > 0) {
      requestedTopics = subjectTopicPairs.map(p => p.topic).filter(Boolean);
    } else if (topic) {
      requestedTopics = [topic];
    }
    
    // Fetch excluded question texts if this is linked to an exam
    const excludedTexts = [];
    if (linkedExamId) {
      const ExamQuestion = require('../exams/exam-question.model');
      const examQuestions = await ExamQuestion.find({ exam: linkedExamId }).select('questionText').lean();
      examQuestions.forEach(eq => {
        if (eq.questionText) excludedTexts.push(eq.questionText);
      });

      const PracticeSession = require('./practice-session.model');
      const previousDPPs = await PracticeSession.find({
        student: studentId,
        linkedExamId: linkedExamId,
        sessionType: 'DPP'
      }).select('questions.questionText').lean();

      previousDPPs.forEach(dpp => {
        if (dpp.questions && Array.isArray(dpp.questions)) {
          dpp.questions.forEach(q => {
            if (q.questionText) excludedTexts.push(q.questionText);
          });
        }
      });
    }

    const uniqueExcludedTexts = [...new Set(excludedTexts)];
    const limit = Math.max(1, parseInt(numberOfQuestions) || 10);
    const matchInstitute = instituteId ? { institute: new mongoose.Types.ObjectId(instituteId) } : {};
    const escapeRegex = (str) => String(str).replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

    let sampledQuestions = [];
    const gatheredQuestionIds = new Set();

    const addUniqueQuestions = (rawList) => {
      if (!Array.isArray(rawList)) return;
      for (const item of rawList) {
        const qId = item.questions?._id?.toString() || item._id?.toString();
        if (qId && !gatheredQuestionIds.has(qId)) {
          gatheredQuestionIds.add(qId);
          sampledQuestions.push(item);
          if (sampledQuestions.length >= limit) break;
        }
      }
    };

    // Base pipeline
    const basePipeline = [
      { $match: matchInstitute },
      { $unwind: "$questions" },
      { $match: { "questions.isUnpublished": { $ne: true } } }
    ];

    if (uniqueExcludedTexts.length > 0) {
      basePipeline.push({ $match: { "questions.questionText": { $nin: uniqueExcludedTexts } } });
    }

    // Build topic match filters
    let topicMatchFilter = null;
    if (requestedTopics.length > 0) {
      const topicRegexArray = requestedTopics.map(t => new RegExp(`^${escapeRegex(t.trim())}$`, 'i'));
      topicMatchFilter = {
        $or: [
          { "questions.topicName": { $in: topicRegexArray } },
          { "questions.chapterName": { $in: topicRegexArray } }
        ]
      };
    }

    // Tier 1: Match requested topics + difficulty
    if (topicMatchFilter && difficulty) {
      const t1Pipeline = [
        ...basePipeline,
        { $match: topicMatchFilter },
        { $match: { "questions.difficulty": difficulty } },
        { $sample: { size: limit } }
      ];
      const res1 = await QuestionBank.aggregate(t1Pipeline);
      addUniqueQuestions(res1);
    }

    // Tier 2: Match requested topics across any difficulty
    if (topicMatchFilter && sampledQuestions.length < limit) {
      const needed = limit - sampledQuestions.length;
      const t2Pipeline = [
        ...basePipeline,
        { $match: topicMatchFilter },
        { $sample: { size: needed * 2 } }
      ];
      const res2 = await QuestionBank.aggregate(t2Pipeline);
      addUniqueQuestions(res2);
    }

    // Tier 3: Match subject if specified
    if (sampledQuestions.length < limit && subject && !['General', 'ALL', 'test', 'Test'].includes(subject)) {
      const needed = limit - sampledQuestions.length;
      const t3Pipeline = [
        ...basePipeline,
        { $match: { "questions.subjectName": { $regex: new RegExp(escapeRegex(subject), 'i') } } },
        { $sample: { size: needed * 2 } }
      ];
      const res3 = await QuestionBank.aggregate(t3Pipeline);
      addUniqueQuestions(res3);
    }

    // Tier 4: Fallback to any questions in the institute's Question Bank
    if (sampledQuestions.length < limit) {
      const needed = limit - sampledQuestions.length;
      const t4Pipeline = [
        { $match: matchInstitute },
        { $unwind: "$questions" },
        { $match: { "questions.isUnpublished": { $ne: true } } },
        { $sample: { size: needed * 2 } }
      ];
      const res4 = await QuestionBank.aggregate(t4Pipeline);
      addUniqueQuestions(res4);
    }

    if (!sampledQuestions || sampledQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found in Question Bank. Please upload questions to Question Bank or use "Write Custom Question" to assign DPP.'
      });
    }
    
    // Sort questions by subjectName so they appear grouped in the UI
    sampledQuestions.sort((a, b) => {
      const subjA = a.questions.subjectName || '';
      const subjB = b.questions.subjectName || '';
      return subjA.localeCompare(subjB);
    });
    
    let totalMarks = 0;
    const embeddedQuestions = sampledQuestions.map((q, idx) => {
      const question = q.questions;
      const marks = Number(question.marks) || 4;
      totalMarks += marks;
      
      return {
        questionId: question._id ? question._id.toString() : `q_${idx}`,
        questionText: question.questionText,
        type: question.type || 'MCQ',
        difficulty: question.difficulty || difficulty || 'Medium',
        subjectName: question.subjectName || subject || 'General',
        topicName: question.topicName || (requestedTopics[idx % requestedTopics.length] || topic || 'General'),
        marks: marks,
        negativeMarks: Number(question.negativeMarks) || 1,
        options: (question.options || []).map((opt, oIdx) => ({
          _id: opt._id ? opt._id.toString() : `opt_${idx}_${oIdx}`,
          text: opt.text,
          isCorrect: Boolean(opt.isCorrect)
        })),
        correctAnswerText: question.correctAnswerText || '',
        explanation: question.explanation || ''
      };
    });
    
    const displayTopic = requestedTopics.length > 0 
      ? requestedTopics.slice(0, 2).join(', ') + (requestedTopics.length > 2 ? '...' : '') 
      : (subject || 'Remedial');
    const title = `${sessionType} - ${displayTopic} (${embeddedQuestions.length} Qs)`;
    
    const isByTeacher = (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'ADMIN' || req.user.role === 'TEACHER') || (studentId && req.user.userId && studentId.toString() !== req.user.userId.toString());

    const sessionData = {
      student: studentId,
      institute: instituteId,
      sessionType,
      title,
      isTeacherAssigned: Boolean(isByTeacher),
      assignedBy: req.user.userId,
      filters: { subject, topic, topics: requestedTopics, difficulty },
      questions: embeddedQuestions,
      answers: [],
      status: 'IN_PROGRESS',
      totalQuestions: embeddedQuestions.length,
      totalMarks: totalMarks,
      score: 0
    };

    if (linkedExamId) sessionData.linkedExamId = linkedExamId;
    if (parentSessionId) sessionData.parentSessionId = parentSessionId;

    const session = await PracticeSession.create(sessionData);

    if (Array.isArray(flagIds) && flagIds.length > 0) {
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.updateMany({ _id: { $in: flagIds } }, { $set: { remedialSessionId: session._id } });
    } else if (flagId) {
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.findByIdAndUpdate(flagId, { remedialSessionId: session._id });
    } else if (studentId && (topic || (topics && topics.length > 0))) {
      const topicList = topics && topics.length > 0 ? topics : [topic];
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.updateMany(
        { studentId, topicName: { $in: topicList }, flag: { $in: ['RED', 'YELLOW'] } },
        { $set: { remedialSessionId: session._id } }
      );
    }
    
    res.status(201).json({ success: true, message: 'DPP generated and assigned successfully!', data: session });
    
  } catch (error) {
    console.error("Error generating session:", error);
    res.status(500).json({ success: false, message: error.message || 'Server error generating session.' });
  }
};

// Manually author or select questions to create a DPP for a specific student
exports.createManualSession = async (req, res) => {
  try {
    const {
      studentId: customStudentId,
      targetStudentId,
      sessionType = 'DPP',
      title,
      subject,
      chapter,
      topic,
      topics,
      difficulty,
      questions, // array of custom question objects
      questionIds, // array of selected QuestionBank question IDs
      flagId,
      flagIds
    } = req.body;

    const instituteId = req.user.instituteId;
    let studentId = req.user.userId;
    if ((req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'ADMIN' || req.user.role === 'TEACHER') && (customStudentId || targetStudentId)) {
      studentId = customStudentId || targetStudentId;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    let finalQuestions = [];
    let totalMarks = 0;

    // 1. If question objects were explicitly passed (manually written)
    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        const marks = Number(q.marks) || 4;
        totalMarks += marks;
        finalQuestions.push({
          questionId: q.questionId || q._id || `manual_${Date.now()}_${idx}`,
          questionText: q.questionText,
          type: q.type || 'MCQ',
          difficulty: q.difficulty || difficulty || 'Medium',
          subjectName: q.subjectName || subject || 'General',
          topicName: q.topicName || topic || 'General',
          marks: marks,
          negativeMarks: Number(q.negativeMarks) || 1,
          options: (q.options || []).map((opt, oIdx) => ({
            _id: opt._id || `opt_${idx}_${oIdx}`,
            text: opt.text || '',
            isCorrect: Boolean(opt.isCorrect)
          })),
          correctAnswerText: q.correctAnswerText || '',
          explanation: q.explanation || ''
        });
      });
    }

    // 2. If question IDs from QuestionBank were selected
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const QuestionBank = require('../exams/question-bank.model');
      const objectIds = questionIds.map(id => new mongoose.Types.ObjectId(id));
      const matched = await QuestionBank.aggregate([
        { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
        { $unwind: "$questions" },
        { $match: { "questions._id": { $in: objectIds } } }
      ]);

      matched.forEach((m, idx) => {
        const q = m.questions;
        const marks = Number(q.marks) || 4;
        totalMarks += marks;
        finalQuestions.push({
          questionId: q._id ? q._id.toString() : `qb_${idx}`,
          questionText: q.questionText,
          type: q.type || 'MCQ',
          difficulty: q.difficulty || difficulty || 'Medium',
          subjectName: q.subjectName || subject || 'General',
          topicName: q.topicName || topic || 'General',
          marks: marks,
          negativeMarks: Number(q.negativeMarks) || 1,
          options: (q.options || []).map((opt, oIdx) => ({
            _id: opt._id ? opt._id.toString() : `opt_${idx}_${oIdx}`,
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect)
          })),
          correctAnswerText: q.correctAnswerText || '',
          explanation: q.explanation || ''
        });
      });
    }

    if (finalQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide or select at least 1 valid question for the DPP.' });
    }

    const sessionTitle = title || `Remedial DPP: ${subject || 'General'} - ${topic || 'Practice'} (${finalQuestions.length} Qs)`;

    const session = await PracticeSession.create({
      student: studentId,
      institute: instituteId,
      sessionType: sessionType || 'DPP',
      title: sessionTitle,
      isTeacherAssigned: true,
      assignedBy: req.user.userId,
      filters: { subject, topic, topics, difficulty },
      questions: finalQuestions,
      answers: [],
      status: 'IN_PROGRESS',
      totalQuestions: finalQuestions.length,
      totalMarks,
      score: 0
    });

    if (Array.isArray(flagIds) && flagIds.length > 0) {
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.updateMany({ _id: { $in: flagIds } }, { $set: { remedialSessionId: session._id } });
    } else if (flagId) {
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.findByIdAndUpdate(flagId, { remedialSessionId: session._id });
    } else if (studentId && (topic || (topics && topics.length > 0))) {
      const topicList = topics && topics.length > 0 ? topics : [topic];
      const PerformanceFlag = require('../performance-flags/performance-flags.model');
      await PerformanceFlag.updateMany(
        { studentId, topicName: { $in: topicList }, flag: { $in: ['RED', 'YELLOW'] } },
        { $set: { remedialSessionId: session._id } }
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Custom DPP assigned to student successfully!',
      data: session
    });
  } catch (error) {
    console.error('Error creating manual DPP session:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating DPP.' });
  }
};

// Get Remedial DPPs for a specific exam
exports.getRemedialDpps = async (req, res) => {
  try {
    const { examId } = req.params;
    const dpps = await PracticeSession.find({
      linkedExamId: examId,
      student: req.user.userId
    }).sort({ createdAt: 1 }); // Sort chronologically

    res.status(200).json({ success: true, data: dpps });
  } catch (error) {
    console.error("Error fetching remedial DPPs:", error);
    res.status(500).json({ success: false, message: 'Server error fetching remedial DPPs.' });
  }
};

// Fetch a specific session to play/resume/review
exports.getSession = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    const userRole = (req.user.role || '').toLowerCase();
    const isStaff = ['teacher', 'admin', 'superadmin', 'admin_acadops'].includes(userRole);
    if (!isStaff) {
      query.student = req.user.userId;
    }
    const session = await PracticeSession.findOne(query)
      .populate('student', 'firstName lastName email metadata')
      .populate('assignedBy', 'firstName lastName email role');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ success: false, message: 'Server error fetching session.' });
  }
};

// Save progress for Pause/Resume or per-question practice
exports.saveProgress = async (req, res) => {
  try {
    const { questionId, selectedOptionId, status } = req.body; // status: ANSWERED, MARKED_FOR_REVIEW, etc
    const session = await PracticeSession.findOne({ _id: req.params.id, student: req.user.userId });
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    
    if (session.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Session already completed.' });
    }
    
    // Find if answer exists
    const answerIndex = session.answers.findIndex(a => a.questionId === questionId);
    
    // Determine correctness for Practice Mode (instant feedback)
    let isCorrect = false;
    if (selectedOptionId) {
      const q = session.questions.find(q => q.questionId === questionId);
      if (q) {
        const correctOpt = (q.options || []).find(o => o.isCorrect);
        if (correctOpt && (
          (correctOpt._id && correctOpt._id.toString() === selectedOptionId) ||
          (correctOpt.id && correctOpt.id.toString() === selectedOptionId) ||
          (correctOpt._id === selectedOptionId)
        )) {
          isCorrect = true;
        }
      }
    }
    
    if (answerIndex > -1) {
      if (selectedOptionId !== undefined) session.answers[answerIndex].selectedOptionId = selectedOptionId;
      if (status !== undefined) session.answers[answerIndex].status = status;
      if (req.body.timeSpentSeconds !== undefined) session.answers[answerIndex].timeSpentSeconds = req.body.timeSpentSeconds;
      session.answers[answerIndex].isCorrect = isCorrect;
    } else {
      session.answers.push({
        questionId,
        selectedOptionId,
        status: status || 'ANSWERED',
        isCorrect,
        timeSpentSeconds: req.body.timeSpentSeconds || 0
      });
    }
    
    await session.save();
    
    // For Practice mode, return the correctness and explanation instantly
    if (session.sessionType === 'PRACTICE' && selectedOptionId) {
       const q = session.questions.find(q => q.questionId === questionId);
       return res.status(200).json({ 
         success: true, 
         data: { isCorrect, explanation: q ? q.explanation : '' } 
       });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    res.status(500).json({ success: false, message: 'Server error saving progress.' });
  }
};

// Submit the entire session and calculate score
exports.submitSession = async (req, res) => {
  try {
    const session = await PracticeSession.findOne({ _id: req.params.id, student: req.user.userId });
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    
    if (session.status === 'COMPLETED') {
      return res.status(200).json({ success: true, data: session }); // already submitted
    }
    
    const { timeSpentPerQuestion, totalTimeSpentSeconds } = req.body || {};
    let score = 0;
    
    // Evaluate all answers
    session.answers.forEach(ans => {
       if ((ans.selectedOptionId && ans.status === 'ANSWERED') || ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
          const q = session.questions.find(q => q.questionId === ans.questionId);
          if (q) {
            const correctOpt = (q.options || []).find(o => o.isCorrect);
            const isCorrectSelected = correctOpt && (
              (correctOpt._id && correctOpt._id.toString() === ans.selectedOptionId) ||
              (correctOpt.id && correctOpt.id.toString() === ans.selectedOptionId) ||
              (correctOpt._id === ans.selectedOptionId)
            );
            
            if (isCorrectSelected) {
              ans.isCorrect = true;
              score += (q.marks || 4);
            } else {
              ans.isCorrect = false;
              score -= (q.negativeMarks || 1);
            }
          }
       }
    });

    // Merge timeSpentPerQuestion if provided (an object map: { questionId: seconds })
    if (timeSpentPerQuestion) {
      Object.keys(timeSpentPerQuestion).forEach(qId => {
        const timeSpent = timeSpentPerQuestion[qId];
        const ans = session.answers.find(a => a.questionId === qId);
        if (ans) {
          ans.timeSpentSeconds = timeSpent;
        } else {
          // Push a stub answer just to track time for viewed-but-unanswered questions
          session.answers.push({
            questionId: qId,
            status: 'NOT_ANSWERED',
            timeSpentSeconds: timeSpent
          });
        }
      });
    }
    
    session.score = score;
    session.status = 'COMPLETED';
    session.completedAt = new Date();
    if (totalTimeSpentSeconds !== undefined) {
      session.totalTimeSpentSeconds = totalTimeSpentSeconds;
    }
    
    await session.save();
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error("Error submitting session:", error);
    res.status(500).json({ success: false, message: 'Server error submitting session.' });
  }
};

// Get session history
exports.getHistory = async (req, res) => {
  try {
    const { sessionType, studentId } = req.query; // 'DPP' or 'PRACTICE'
    const userRole = (req.user.role || '').toLowerCase();
    const isStaff = ['teacher', 'admin', 'superadmin', 'admin_acadops'].includes(userRole);

    const query = {};
    if (isStaff) {
      const orConditions = [];
      if (req.user.instituteId) {
        orConditions.push({ institute: req.user.instituteId });
      }
      if (req.user.userId) {
        orConditions.push({ assignedBy: req.user.userId });
      }
      orConditions.push({ isTeacherAssigned: true });

      query.$or = orConditions;
      if (studentId) {
        query.student = studentId;
      }
    } else {
      query.student = req.user.userId;
    }

    if (sessionType) query.sessionType = sessionType;
    
    const sessions = await PracticeSession.find(query)
      .select('-questions -answers') // Exclude bulky arrays for list view
      .populate('student', 'firstName lastName email metadata')
      .populate('assignedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ success: false, message: 'Server error fetching history.' });
  }
};
