const PracticeSession = require('./practice-session.model');
const QuestionBank = require('../exams/question-bank.model');
const mongoose = require('mongoose');

// Get available subjects, chapters, and topics for the student's institute
exports.getFilters = async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    
    // Aggregate to get unique subjects, topics, and difficulties with their counts
    const filterCounts = await QuestionBank.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      { $unwind: "$questions" },
      { $group: {
          _id: {
            subject: "$questions.subjectName",
            topic: "$questions.topicName",
            difficulty: "$questions.difficulty"
          },
          count: { $sum: 1 }
      }}
    ]);
    
    // Process the flat counts into a structured format for the frontend
    const subjectsMap = {};
    const rawCounts = [];

    filterCounts.forEach(f => {
      const subj = f._id.subject || 'General';
      const top = f._id.topic || 'General';
      const diff = f._id.difficulty || 'Medium';
      const count = f.count;
      
      rawCounts.push({ subject: subj, topic: top, difficulty: diff, count });

      if (!subjectsMap[subj]) {
        subjectsMap[subj] = { subject: subj, topics: new Set() };
      }
      if (top) {
        subjectsMap[subj].topics.add(top);
      }
    });
    
    const result = Object.values(subjectsMap).map(s => ({
      subject: s.subject,
      topics: Array.from(s.topics)
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
    const { sessionType, subject, topic, difficulty, numberOfQuestions } = req.body;
    const instituteId = req.user.instituteId;
    const studentId = req.user.userId;

    if (!sessionType || !['DPP', 'PRACTICE'].includes(sessionType)) {
      return res.status(400).json({ success: false, message: 'Invalid session type.' });
    }
    
    const limit = parseInt(numberOfQuestions) || 10;
    
    // Build match query for aggregation
    const matchQuery = { institute: new mongoose.Types.ObjectId(instituteId) };
    
    const qMatch = {};
    if (subject) qMatch["questions.subjectName"] = subject;
    if (topic) qMatch["questions.topicName"] = topic;
    if (difficulty) qMatch["questions.difficulty"] = difficulty;
    
    const aggregationPipeline = [
      { $match: matchQuery },
      { $unwind: "$questions" }
    ];
    
    if (Object.keys(qMatch).length > 0) {
      aggregationPipeline.push({ $match: qMatch });
    }
    
    // Randomize and limit
    aggregationPipeline.push({ $sample: { size: limit } });
    
    const randomQuestions = await QuestionBank.aggregate(aggregationPipeline);
    
    if (!randomQuestions || randomQuestions.length === 0) {
      return res.status(404).json({ success: false, message: 'No questions found matching the selected criteria.' });
    }
    
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
    
    const session = await PracticeSession.create({
      student: studentId,
      institute: instituteId,
      sessionType,
      title,
      filters: { subject, topic, difficulty },
      questions: embeddedQuestions,
      answers: [],
      status: 'IN_PROGRESS',
      totalQuestions: embeddedQuestions.length,
      totalMarks: totalMarks,
      score: 0
    });
    
    res.status(201).json({ success: true, data: session });
    
  } catch (error) {
    console.error("Error generating session:", error);
    res.status(500).json({ success: false, message: 'Server error generating session.' });
  }
};

// Fetch a specific session to play/resume
exports.getSession = async (req, res) => {
  try {
    const session = await PracticeSession.findOne({ 
      _id: req.params.id, 
      student: req.user.userId 
    });
    
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
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt && correctOpt._id.toString() === selectedOptionId) {
          isCorrect = true;
        }
      }
    }
    
    if (answerIndex > -1) {
      if (selectedOptionId !== undefined) session.answers[answerIndex].selectedOptionId = selectedOptionId;
      if (status !== undefined) session.answers[answerIndex].status = status;
      session.answers[answerIndex].isCorrect = isCorrect;
    } else {
      session.answers.push({
        questionId,
        selectedOptionId,
        status: status || 'ANSWERED',
        isCorrect
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
    
    let score = 0;
    
    // Evaluate all answers
    session.answers.forEach(ans => {
       if (ans.selectedOptionId && ans.status === 'ANSWERED' || ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
          const q = session.questions.find(q => q.questionId === ans.questionId);
          if (q) {
            const correctOpt = q.options.find(o => o.isCorrect);
            if (correctOpt && correctOpt._id.toString() === ans.selectedOptionId) {
              ans.isCorrect = true;
              score += (q.marks || 4);
            } else {
              ans.isCorrect = false;
              score -= (q.negativeMarks || 1);
            }
          }
       }
    });
    
    session.score = score;
    session.status = 'COMPLETED';
    session.completedAt = new Date();
    
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
