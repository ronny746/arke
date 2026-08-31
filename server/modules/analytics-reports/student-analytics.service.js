const ExamSubmission = require('../exams/exam-submission.model');
const ExamQuestion = require('../exams/exam-question.model');
const OnlineExam = require('../exams/exam.model');
const mongoose = require('mongoose');

exports.getStudentPerformance = async (studentId) => {
  // 1. Fetch all completed submissions for the student
  const submissions = await ExamSubmission.find({
    student: studentId,
    status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
  })
    .populate('exam', 'title examType totalMarks totalQuestions settings createdAt')
    .populate({
      path: 'answers.questionId',
      select: 'marks negativeMarks subject type',
      populate: { path: 'subject', select: 'name' }
    })
    .sort({ createdAt: -1 });

  let totalExamsTaken = submissions.length;
  let totalScoreObtained = 0;
  let totalPossibleScore = 0;
  
  let subjectStats = {};
  
  const recentExams = submissions.map(sub => {
    let subTotalMarks = 0;
    
    // Process answers for subject-wise performance
    sub.answers.forEach(ans => {
      const q = ans.questionId;
      if (!q) return;
      
      const subjectName = q.subject?.name || 'General';
      const possibleMarks = q.marks || 0;
      
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = {
          subject: subjectName,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          marksObtained: 0,
          totalPossibleMarks: 0
        };
      }
      
      subjectStats[subjectName].totalQuestions += 1;
      subjectStats[subjectName].totalPossibleMarks += possibleMarks;
      subTotalMarks += possibleMarks;
      
      if (ans.status !== 'NOT_ANSWERED') {
        subjectStats[subjectName].attempted += 1;
        if (ans.isCorrect) {
          subjectStats[subjectName].correct += 1;
        } else {
          subjectStats[subjectName].wrong += 1;
        }
        subjectStats[subjectName].marksObtained += (ans.marksObtained || 0);
      }
    });

    totalScoreObtained += (sub.score || 0);
    totalPossibleScore += subTotalMarks; // Calculate total possible marks from questions

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

  // Calculate percentages for subjects
  const subjectWisePerformance = Object.values(subjectStats).map(stat => ({
    ...stat,
    percentage: stat.totalPossibleMarks > 0 ? ((stat.marksObtained / stat.totalPossibleMarks) * 100).toFixed(2) : 0,
    accuracy: stat.attempted > 0 ? ((stat.correct / stat.attempted) * 100).toFixed(2) : 0
  }));

  const overall = {
    totalExamsTaken,
    averageScore: totalExamsTaken > 0 ? (totalScoreObtained / totalExamsTaken).toFixed(2) : 0,
    overallPercentage: totalPossibleScore > 0 ? ((totalScoreObtained / totalPossibleScore) * 100).toFixed(2) : 0
  };

  return {
    overall,
    subjectWise: subjectWisePerformance,
    recentExams
  };
};
