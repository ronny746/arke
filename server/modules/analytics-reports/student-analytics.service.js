const ExamSubmission = require('../exams/exam-submission.model');
const ExamQuestion = require('../exams/exam-question.model');
const OnlineExam = require('../exams/exam.model');
const mongoose = require('mongoose');
const PracticeSession = require('../practice/practice-session.model');

exports.getStudentPerformance = async (studentId) => {
  // 1. Fetch all completed submissions for the student
  const submissions = await ExamSubmission.find({
    student: studentId,
    status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
  })
    .populate('exam', 'title examType totalMarks totalQuestions settings createdAt')
    .populate({
      path: 'answers.questionId',
      select: 'marks negativeMarks subject topic difficulty type',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'topic', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 });

  const examIds = submissions.map(sub => sub.exam?._id).filter(Boolean);
  const allQuestions = await ExamQuestion.find({ exam: { $in: examIds } })
    .populate('subject', 'name')
    .populate('topic', 'name')
    .lean();

  const questionsByExam = {};
  allQuestions.forEach(q => {
    const eid = String(q.exam);
    if (!questionsByExam[eid]) questionsByExam[eid] = [];
    questionsByExam[eid].push(q);
  });

  let totalExamsTaken = submissions.length;
  let totalScoreObtained = 0;
  let totalPossibleScore = 0;
  
  let examSubjectStats = {};
  
  const updateSubjectStats = (statsObj, subjectName, topicName, diffName, possibleMarks, status, isCorrect, marksObtained) => {
    if (!statsObj[subjectName]) {
      statsObj[subjectName] = { subject: subjectName, totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, marksObtained: 0, totalPossibleMarks: 0, topics: {}, difficulties: {} };
    }
    const subjNode = statsObj[subjectName];
    
    if (!subjNode.topics[topicName]) {
      subjNode.topics[topicName] = { topic: topicName, totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, marksObtained: 0, totalPossibleMarks: 0, difficulties: {} };
    }
    const topicNode = subjNode.topics[topicName];
    
    if (!topicNode.difficulties[diffName]) {
      topicNode.difficulties[diffName] = { difficulty: diffName, totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, marksObtained: 0, totalPossibleMarks: 0 };
    }
    if (!subjNode.difficulties[diffName]) {
      subjNode.difficulties[diffName] = { difficulty: diffName, totalQuestions: 0, attempted: 0, correct: 0, wrong: 0, marksObtained: 0, totalPossibleMarks: 0 };
    }
    
    const incrementCounts = (node) => {
      node.totalQuestions += 1;
      node.totalPossibleMarks += possibleMarks;
      if (status !== 'NOT_ANSWERED') {
        node.attempted += 1;
        if (isCorrect) {
          node.correct += 1;
        } else {
          node.wrong += 1;
        }
        node.marksObtained += (marksObtained || 0);
      }
    };

    incrementCounts(subjNode);
    incrementCounts(topicNode);
    incrementCounts(topicNode.difficulties[diffName]);
    incrementCounts(subjNode.difficulties[diffName]);
  };
  
  const recentExams = submissions.map(sub => {
    let subTotalMarks = 0;
    
    // Process answers for subject-wise performance
    const examQuestions = questionsByExam[String(sub.exam?._id)] || [];
    examQuestions.forEach(q => {
      const subjectName = q.subject?.name || 'General';
      const topicName = q.topic?.name || 'General Topic';
      const diffName = q.difficulty || 'Medium';
      const possibleMarks = q.marks || 0;
      
      const ans = sub.answers.find(a => String(a.questionId?._id || a.questionId) === String(q._id));
      const status = ans ? ans.status : 'NOT_ANSWERED';
      const isCorrect = ans ? ans.isCorrect : false;
      const marksObtained = ans ? (ans.marksObtained || 0) : 0;
      
      updateSubjectStats(examSubjectStats, subjectName, topicName, diffName, possibleMarks, status, isCorrect, marksObtained);
      
      subTotalMarks += possibleMarks;
    });

    totalScoreObtained += (sub.score || 0);
    totalPossibleScore += subTotalMarks;

    return {
      submissionId: sub._id,
      examId: sub.exam?._id,
      examTitle: sub.exam?.title,
      examType: sub.exam?.examType,
      date: sub.endTime || sub.createdAt,
      score: sub.score,
      totalMarks: subTotalMarks, 
      percentage: subTotalMarks > 0 ? ((sub.score / subTotalMarks) * 100).toFixed(2) : 0,
      totalCorrect: sub.totalCorrect,
      totalWrong: sub.totalWrong,
      totalUnattempted: sub.totalUnattempted
    };
  });

  const calcNodeStats = (stat) => ({
    ...stat,
    percentage: stat.totalPossibleMarks > 0 ? ((stat.marksObtained / stat.totalPossibleMarks) * 100).toFixed(2) : 0,
    accuracy: stat.attempted > 0 ? ((stat.correct / stat.attempted) * 100).toFixed(2) : 0
  });

  // Calculate percentages and restructure
  const processStatsObject = (statsObj) => {
    return Object.values(statsObj).map(subjNode => {
      const subjRes = calcNodeStats(subjNode);
      subjRes.difficulties = Object.values(subjNode.difficulties).map(calcNodeStats);
      subjRes.topics = Object.values(subjNode.topics).map(topNode => {
        const topRes = calcNodeStats(topNode);
        topRes.difficulties = Object.values(topNode.difficulties).map(calcNodeStats);
        return topRes;
      });
      return subjRes;
    });
  };

  const subjectWisePerformance = processStatsObject(examSubjectStats);

  const overall = {
    totalExamsTaken,
    averageScore: totalExamsTaken > 0 ? (totalScoreObtained / totalExamsTaken).toFixed(2) : 0,
    overallPercentage: totalPossibleScore > 0 ? ((totalScoreObtained / totalPossibleScore) * 100).toFixed(2) : 0
  };

  // Fetch DPP / Practice Session stats
  const practiceSessions = await PracticeSession.find({
    student: studentId,
    status: 'COMPLETED',
    sessionType: 'DPP'
  }).sort({ completedAt: -1 });

  let totalDppsTaken = practiceSessions.length;
  let totalDppScoreObtained = 0;
  let totalPossibleDppScore = 0;

  let dppSubjectStats = {};

  const recentDpps = practiceSessions.map(session => {
    let subTotalMarks = 0;
    
    session.questions.forEach(q => {
      const possibleMarks = q.marks || 4;
      subTotalMarks += possibleMarks;
      
      // Calculate subject stats
      const subjectName = q.subjectName || 'General';
      const topicName = q.topicName || 'General Topic';
      const diffName = q.difficulty || 'Medium';
      
      const ans = session.answers?.find(a => a.questionId === q.questionId || a.questionId === q._id);
      const isCorrect = ans ? ans.isCorrect : false;
      const status = ans ? ans.status : 'NOT_ANSWERED';
      const marksObtained = isCorrect ? possibleMarks : (status !== 'NOT_ANSWERED' ? -1 : 0); // Assuming -1 for negative marking default, but DPPs might not have negative. Let's use 0 if not correct to be safe, or just calculate score.
      
      updateSubjectStats(dppSubjectStats, subjectName, topicName, diffName, possibleMarks, status, isCorrect, marksObtained);
    });

    totalDppScoreObtained += (session.score || 0);
    totalPossibleDppScore += subTotalMarks;

    return {
      sessionId: session._id,
      title: session.title,
      date: session.completedAt || session.createdAt,
      score: session.score,
      totalMarks: subTotalMarks,
      percentage: subTotalMarks > 0 ? ((session.score / subTotalMarks) * 100).toFixed(2) : 0,
      totalTimeSpentSeconds: session.totalTimeSpentSeconds || 0
    };
  });

  const dppOverall = {
    totalDppsTaken,
    averageScore: totalDppsTaken > 0 ? (totalDppScoreObtained / totalDppsTaken).toFixed(2) : 0,
    overallPercentage: totalPossibleDppScore > 0 ? ((totalDppScoreObtained / totalPossibleDppScore) * 100).toFixed(2) : 0
  };

  const dppSubjectWisePerformance = processStatsObject(dppSubjectStats);

  // Fetch Practice Papers count (sessionType: 'PRACTICE')
  const practicePaperCount = await PracticeSession.countDocuments({
    student: studentId,
    status: 'COMPLETED',
    sessionType: 'PRACTICE'
  });

  const dppCount = practiceSessions.length;
  const liveExamCount = totalExamsTaken;

  // Calculate Accuracy per subject
  let phyAttempted = 0, phyCorrect = 0;
  let chemAttempted = 0, chemCorrect = 0;
  let bioAttempted = 0, bioCorrect = 0;

  let grandTotalAttempted = 0;
  let grandTotalCorrect = 0;

  const processSubjectNode = (s) => {
    const sName = (s.subject || '').toUpperCase();
    const attempted = s.attempted || 0;
    const correct = s.correct || 0;

    grandTotalAttempted += attempted;
    grandTotalCorrect += correct;

    if (sName.includes('PHYSIC')) {
      phyAttempted += attempted;
      phyCorrect += correct;
    } else if (sName.includes('CHEM')) {
      chemAttempted += attempted;
      chemCorrect += correct;
    } else if (sName.includes('BIO') || sName.includes('BOTANY') || sName.includes('ZOOLOGY')) {
      bioAttempted += attempted;
      bioCorrect += correct;
    }
  };

  subjectWisePerformance.forEach(processSubjectNode);
  dppSubjectWisePerformance.forEach(processSubjectNode);

  const physicsAccuracy = phyAttempted > 0 ? ((phyCorrect / phyAttempted) * 100).toFixed(1) : "0.0";
  const chemistryAccuracy = chemAttempted > 0 ? ((chemCorrect / chemAttempted) * 100).toFixed(1) : "0.0";
  const biologyAccuracy = bioAttempted > 0 ? ((bioCorrect / bioAttempted) * 100).toFixed(1) : "0.0";

  const overallAccuracyNum = grandTotalAttempted > 0 ? ((grandTotalCorrect / grandTotalAttempted) * 100).toFixed(1) : "0.0";

  return {
    overall,
    subjectWise: subjectWisePerformance,
    recentExams,
    dppData: {
      overall: dppOverall,
      subjectWise: dppSubjectWisePerformance,
      recentDpps
    },
    dashboardSummary: {
      overallAccuracy: `${overallAccuracyNum}%`,
      overallAccuracyValue: parseFloat(overallAccuracyNum),
      subjectAccuracies: {
        physics: parseFloat(physicsAccuracy),
        chemistry: parseFloat(chemistryAccuracy),
        biology: parseFloat(biologyAccuracy),
      },
      counts: {
        liveExams: liveExamCount,
        dpps: dppCount,
        practicePapers: practicePaperCount,
      }
    }
  };
};
