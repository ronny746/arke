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
exports.generateSession = async (req, res) => {
  try {
    const { sessionType, subject, chapter, topic, topics, subjectTopicPairs, difficulty, numberOfQuestions, linkedExamId, parentSessionId } = req.body;
    const instituteId = req.user.instituteId;
    const studentId = req.user.userId;

    if (!sessionType || !['DPP', 'PRACTICE'].includes(sessionType)) {
      return res.status(400).json({ success: false, message: 'Invalid session type.' });
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

    let randomQuestions = [];

    // If subjectTopicPairs is provided, sample at least 2 questions PER weak topic (min 5 questions if 1 topic, scaling past 30 if >15 topics)
    if (subjectTopicPairs && Array.isArray(subjectTopicPairs) && subjectTopicPairs.length > 0) {
      const numWeakTopics = subjectTopicPairs.length;
      let targetTotalQuestions;
      let sampleSizePerTopic;

      if (numWeakTopics === 1) {
        targetTotalQuestions = 5;
        sampleSizePerTopic = 5;
      } else {
        const minRequired = numWeakTopics * 2;
        const baseLimit = parseInt(numberOfQuestions) || 30;
        targetTotalQuestions = Math.max(baseLimit, minRequired);
        sampleSizePerTopic = Math.max(2, Math.ceil(targetTotalQuestions / numWeakTopics));
      }

      const buildFacetPipeline = (excludeTexts) => {
        const facetPipeline = {};
        subjectTopicPairs.forEach((pair, idx) => {
          const pipeline = [
            { $match: { "questions.subjectName": pair.subject, "questions.topicName": pair.topic } }
          ];
          if (excludeTexts && excludeTexts.length > 0) {
            pipeline.push({ $match: { "questions.questionText": { $nin: excludeTexts } } });
          }
          pipeline.push({ $sample: { size: sampleSizePerTopic } });
          facetPipeline[`topic_${idx}`] = pipeline;
        });
        return facetPipeline;
      };

      const aggregationPipeline = [
        { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
        { $unwind: "$questions" },
        { $facet: buildFacetPipeline(uniqueExcludedTexts) }
      ];

      let facetResults = await QuestionBank.aggregate(aggregationPipeline);

      if (facetResults && facetResults.length > 0) {
        Object.values(facetResults[0]).forEach(arr => {
          randomQuestions = randomQuestions.concat(arr);
        });
      }

      // If excluding previous texts resulted in 0 questions, fallback without exclusion
      if (randomQuestions.length === 0 && uniqueExcludedTexts.length > 0) {
        const fallbackPipeline = [
          { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
          { $unwind: "$questions" },
          { $facet: buildFacetPipeline([]) }
        ];
        facetResults = await QuestionBank.aggregate(fallbackPipeline);
        if (facetResults && facetResults.length > 0) {
          Object.values(facetResults[0]).forEach(arr => {
            randomQuestions = randomQuestions.concat(arr);
          });
        }
      }

    } else {
      const limit = parseInt(numberOfQuestions) || 10;
      const matchQuery = { institute: new mongoose.Types.ObjectId(instituteId) };
      const qMatch = {};
      
      if (subject) qMatch["questions.subjectName"] = subject;
      if (chapter) qMatch["questions.chapterName"] = chapter;
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        qMatch["questions.topicName"] = { $in: topics };
      } else if (topic) {
        qMatch["questions.topicName"] = topic;
      }
      if (difficulty) qMatch["questions.difficulty"] = difficulty;
      if (uniqueExcludedTexts.length > 0) {
        qMatch["questions.questionText"] = { $nin: uniqueExcludedTexts };
      }
      
      const aggregationPipeline = [
        { $match: matchQuery },
        { $unwind: "$questions" }
      ];
      
      if (Object.keys(qMatch).length > 0) {
        aggregationPipeline.push({ $match: qMatch });
      }
      
      aggregationPipeline.push({ $sample: { size: limit } });
      
      randomQuestions = await QuestionBank.aggregate(aggregationPipeline);
    }
    
    if (!randomQuestions || randomQuestions.length === 0) {
      return res.status(404).json({ success: false, message: 'No more unique questions available for these topics in the database.' });
    }
    
    // Sort questions by subjectName so they appear grouped in the UI
    randomQuestions.sort((a, b) => {
      const subjA = a.questions.subjectName || '';
      const subjB = b.questions.subjectName || '';
      return subjA.localeCompare(subjB);
    });
    
    let totalMarks = 0;
    const embeddedQuestions = randomQuestions.map((q, idx) => {
      const question = q.questions;
      const marks = question.marks || 4;
      totalMarks += marks;
      
      return {
        questionId: question._id ? question._id.toString() : `q_${idx}`,
        questionText: question.questionText,
        type: question.type || 'MCQ',
        difficulty: question.difficulty,
        subjectName: question.subjectName,
        topicName: question.topicName,
        marks: marks,
        negativeMarks: question.negativeMarks || 1,
        options: question.options,
        correctAnswerText: question.correctAnswerText,
        explanation: question.explanation
      };
    });
    
    const title = `${sessionType} - ${subject || 'Mixed'} (${embeddedQuestions.length} Qs)`;
    
    const sessionData = {
      student: studentId,
      institute: instituteId,
      sessionType,
      title,
      filters: { subject, topic, topics, difficulty },
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
    
    res.status(201).json({ success: true, data: session });
    
  } catch (error) {
    console.error("Error generating session:", error);
    res.status(500).json({ success: false, message: 'Server error generating session.' });
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

// Fetch a specific session to play/resume
exports.getSession = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'teacher') {
      query.student = req.user.userId;
    }
    const session = await PracticeSession.findOne(query);
    
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
    const { sessionType } = req.query; // 'DPP' or 'PRACTICE'
    const query = { student: req.user.userId };
    if (sessionType) query.sessionType = sessionType;
    
    const sessions = await PracticeSession.find(query)
      .select('-questions -answers') // Exclude bulky arrays for list view
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ success: false, message: 'Server error fetching history.' });
  }
};
