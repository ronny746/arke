const fs = require('fs');
const file = 'server/modules/analytics-reports/student-analytics.service.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("const PracticeSession")) {
  content = content.replace(
    `const mongoose = require('mongoose');`,
    `const mongoose = require('mongoose');\nconst PracticeSession = require('../practice/practice-session.model');`
  );
}

const beforeReturn = `  const overall = {
    totalExamsTaken,
    averageScore: totalExamsTaken > 0 ? (totalScoreObtained / totalExamsTaken).toFixed(2) : 0,
    overallPercentage: totalPossibleScore > 0 ? ((totalScoreObtained / totalPossibleScore) * 100).toFixed(2) : 0
  };`;

const newCode = `  const overall = {
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

  const recentDpps = practiceSessions.map(session => {
    let subTotalMarks = 0;
    session.questions.forEach(q => {
      subTotalMarks += (q.marks || 4);
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
  };`;

content = content.replace(beforeReturn, newCode);

const returnObj = `  return {
    overall,
    subjectWise: subjectWisePerformance,
    recentExams
  };`;

const newReturnObj = `  return {
    overall,
    subjectWise: subjectWisePerformance,
    recentExams,
    dppData: {
      overall: dppOverall,
      recentDpps
    }
  };`;

content = content.replace(returnObj, newReturnObj);

fs.writeFileSync(file, content);
