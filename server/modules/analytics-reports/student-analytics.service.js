const ExamSubmission = require('../exams/exam-submission.model');
const ExamQuestion = require('../exams/exam-question.model');
const OnlineExam = require('../exams/exam.model');
const mongoose = require('mongoose');
const PracticeSession = require('../practice/practice-session.model');
require('../exams/category.model');

exports.getStudentPerformance = async (studentId) => {
  const User = require('../users/users.model');
  const Batch = require('../batches/batches.model');
  const [studentDoc, studentBatches] = await Promise.all([
    User.findById(studentId).select('firstName lastName email metadata').lean(),
    Batch.find({ students: studentId }).select('name section course academicYear').lean()
  ]);

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
      isTeacherAssigned: Boolean(session.isTeacherAssigned || session.assignedBy || session.title?.toLowerCase().includes('remedial')),
      subject: session.filters?.subject || 'General',
      topics: session.filters?.topics || (session.filters?.topic ? [session.filters.topic] : []),
      date: session.completedAt || session.createdAt,
      score: session.score || 0,
      totalMarks: subTotalMarks || session.totalMarks || (session.totalQuestions * 4),
      totalQuestions: session.totalQuestions || session.questions?.length || 0,
      percentage: subTotalMarks > 0 ? ((session.score / subTotalMarks) * 100).toFixed(1) : 0,
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

  // Keep every subject name emitted by the student's actual activity. Do not
  // collapse data into a fixed exam-specific set of subjects.
  const subjectAccuracyStats = new Map();
  let grandTotalAttempted = 0;
  let grandTotalCorrect = 0;

  const processSubjectNode = (s) => {
    const subjectName = String(s.subject || '').trim();
    const attempted = s.attempted || 0;
    const correct = s.correct || 0;

    grandTotalAttempted += attempted;
    grandTotalCorrect += correct;

    if (!subjectName) return;
    const existing = subjectAccuracyStats.get(subjectName) || { attempted: 0, correct: 0 };
    subjectAccuracyStats.set(subjectName, {
      attempted: existing.attempted + attempted,
      correct: existing.correct + correct
    });
  };

  subjectWisePerformance.forEach(processSubjectNode);
  dppSubjectWisePerformance.forEach(processSubjectNode);

  const subjectAccuracies = Object.fromEntries(
    [...subjectAccuracyStats.entries()].map(([subjectName, stats]) => [
      subjectName,
      stats.attempted > 0 ? Number(((stats.correct / stats.attempted) * 100).toFixed(1)) : 0
    ])
  );

  const overallAccuracyNum = grandTotalAttempted > 0 ? ((grandTotalCorrect / grandTotalAttempted) * 100).toFixed(1) : "0.0";

  return {
    student: studentDoc,
    batches: studentBatches || [],
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
      subjectAccuracies,
      counts: {
        liveExams: liveExamCount,
        dpps: dppCount,
        practicePaperCount,
      }
    }
  };
};

exports.getBatchPerformance = async ({ batchId, instituteId, subject }) => {
  const User = require('../users/users.model');
  const Batch = require('../batches/batches.model');
  const PerformanceFlag = require('../performance-flags/performance-flags.model');

  let batchDoc = null;
  let students = [];

  if (batchId && batchId !== 'all') {
    batchDoc = await Batch.findById(batchId).populate('students', 'firstName lastName email metadata isActive').lean();
    if (batchDoc) {
      students = batchDoc.students || [];
    }
  } else {
    students = await User.find({ instituteId, role: 'student', isActive: true }).select('firstName lastName email metadata isActive').lean();
  }

  const studentIds = students.map(s => s._id);

  // 1. Fetch completed submissions for all students in batch
  const submissions = await ExamSubmission.find({
    student: { $in: studentIds },
    status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
  })
    .populate('exam', 'title examType totalMarks totalQuestions settings createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // 2. Fetch distinct questions across these exams to map exact subject and topic breakdown
  const examIds = [...new Set(submissions.map(s => String(s.exam?._id || s.exam)).filter(Boolean))];
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

  // 3. Fetch performance flags & practice sessions
  const flagQuery = { studentId: { $in: studentIds } };
  if (subject && subject !== 'ALL') {
    flagQuery.subjectName = { $regex: new RegExp(`^${subject}$`, 'i') };
  }
  const [flags, practiceSessions] = await Promise.all([
    PerformanceFlag.find(flagQuery).lean(),
    PracticeSession.find({ student: { $in: studentIds }, status: 'COMPLETED' }).lean()
  ]);

  // Maps for student-level aggregation
  const studentStatsMap = new Map();
  // Maps for exam-level aggregation
  const examStatsMap = new Map();
  // Maps for subject-level aggregation
  const subjectStatsMap = new Map();

  const getOrInitStudent = (sId) => {
    const idStr = String(sId);
    if (!studentStatsMap.has(idStr)) {
      studentStatsMap.set(idStr, {
        studentId: idStr,
        totalExams: 0,
        totalDpps: 0,
        totalScore: 0,
        totalPossibleScore: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalAttempted: 0,
        exams: [],
        subjects: {},
        weakTopics: []
      });
    }
    return studentStatsMap.get(idStr);
  };

  const getOrInitSubject = (sName) => {
    if (!subjectStatsMap.has(sName)) {
      subjectStatsMap.set(sName, {
        subject: sName,
        totalAttempted: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalScore: 0,
        totalPossibleScore: 0,
        evaluatedStudents: new Set(),
        weakTopicsMap: new Map(),
        strongCount: 0,
        averageCount: 0,
        weakCount: 0
      });
    }
    return subjectStatsMap.get(sName);
  };

  // Process all submissions for students and subject trees
  submissions.forEach(sub => {
    const sId = String(sub.student);
    const sStat = getOrInitStudent(sId);
    const eid = String(sub.exam?._id || sub.exam);
    const examQuestions = questionsByExam[eid] || [];
    
    let subPossibleMarks = 0;
    let subCorrect = 0;
    let subWrong = 0;
    let subAttempted = 0;

    // Track per-subject for this specific submission
    examQuestions.forEach(q => {
      const subName = q.subject?.name || 'General';
      const topName = q.topic?.name || 'General Topic';
      const possibleMarks = q.marks || 4;
      subPossibleMarks += possibleMarks;

      const ans = (sub.answers || []).find(a => String(a.questionId?._id || a.questionId) === String(q._id));
      const status = ans ? ans.status : 'NOT_ANSWERED';
      const isCorrect = ans ? ans.isCorrect : false;
      const marksObtained = ans ? (ans.marksObtained || 0) : 0;

      // Student subject tracker
      if (!sStat.subjects[subName]) {
        sStat.subjects[subName] = {
          subject: subName,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          marksObtained: 0,
          totalPossibleMarks: 0,
          accuracy: 0,
          percentage: 0,
          weakTopics: []
        };
      }
      const stSub = sStat.subjects[subName];
      stSub.totalQuestions += 1;
      stSub.totalPossibleMarks += possibleMarks;

      const gSub = getOrInitSubject(subName);
      gSub.evaluatedStudents.add(sId);
      gSub.totalPossibleScore += possibleMarks;

      if (status !== 'NOT_ANSWERED') {
        subAttempted += 1;
        stSub.attempted += 1;
        gSub.totalAttempted += 1;
        if (isCorrect) {
          subCorrect += 1;
          stSub.correct += 1;
          gSub.totalCorrect += 1;
        } else {
          subWrong += 1;
          stSub.wrong += 1;
          gSub.totalWrong += 1;
        }
        stSub.marksObtained += marksObtained;
        gSub.totalScore += marksObtained;
      }
    });

    sStat.totalExams += 1;
    sStat.totalScore += (sub.score || 0);
    sStat.totalPossibleScore += subPossibleMarks;
    sStat.totalCorrect += (sub.totalCorrect ?? subCorrect);
    sStat.totalWrong += (sub.totalWrong ?? subWrong);
    sStat.totalAttempted += ((sub.totalCorrect ?? subCorrect) + (sub.totalWrong ?? subWrong));

    const examAccuracy = (subCorrect + subWrong) > 0 ? Number(((subCorrect / (subCorrect + subWrong)) * 100).toFixed(1)) : 0;
    const examPercentage = subPossibleMarks > 0 ? Number(((sub.score / subPossibleMarks) * 100).toFixed(1)) : 0;

    const examSummaryItem = {
      submissionId: sub._id,
      examId: sub.exam?._id,
      examTitle: sub.exam?.title || 'Online Test',
      examType: sub.exam?.examType || 'Objective',
      date: sub.endTime || sub.createdAt,
      score: sub.score || 0,
      totalMarks: subPossibleMarks || sub.exam?.totalMarks || 100,
      accuracy: examAccuracy,
      percentage: examPercentage,
      totalCorrect: sub.totalCorrect ?? subCorrect,
      totalWrong: sub.totalWrong ?? subWrong,
      totalUnattempted: sub.totalUnattempted ?? (examQuestions.length - subAttempted)
    };
    sStat.exams.push(examSummaryItem);

    // Track batch-level exam entry
    if (!examStatsMap.has(eid)) {
      examStatsMap.set(eid, {
        examId: eid,
        title: sub.exam?.title || 'Online Test',
        examType: sub.exam?.examType || 'Objective',
        date: sub.endTime || sub.createdAt,
        totalMarks: subPossibleMarks || sub.exam?.totalMarks || 100,
        submissionsCount: 0,
        totalScoreSum: 0,
        highestScore: -Infinity,
        lowestScore: Infinity,
        accuraciesSum: 0,
        studentSubmissions: []
      });
    }
    const eStat = examStatsMap.get(eid);
    eStat.submissionsCount += 1;
    eStat.totalScoreSum += (sub.score || 0);
    eStat.highestScore = Math.max(eStat.highestScore, sub.score || 0);
    eStat.lowestScore = Math.min(eStat.lowestScore, sub.score || 0);
    eStat.accuraciesSum += examAccuracy;
    eStat.studentSubmissions.push({
      studentId: sId,
      score: sub.score || 0,
      accuracy: examAccuracy,
      percentage: examPercentage
    });
  });

  // Incorporate DPP session counts
  practiceSessions.forEach(dpp => {
    const sStat = getOrInitStudent(dpp.student);
    sStat.totalDpps += 1;
  });

  // Incorporate topic flags into student & subject stats
  flags.forEach(f => {
    const sStat = getOrInitStudent(f.studentId);
    const subName = f.subjectName || 'General';
    if (f.flag === 'RED' || f.percentage < 50) {
      sStat.weakTopics.push({ subject: subName, topic: f.topicName, percentage: f.percentage, flag: f.flag });
      const gSub = getOrInitSubject(subName);
      gSub.weakTopicsMap.set(f.topicName, (gSub.weakTopicsMap.get(f.topicName) || 0) + 1);
    }
  });

  // Calculate final student analytics objects
  const studentsList = students.map(st => {
    const sId = String(st._id);
    const stat = studentStatsMap.get(sId) || {
      studentId: sId,
      totalExams: 0,
      totalDpps: 0,
      totalScore: 0,
      totalPossibleScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalAttempted: 0,
      exams: [],
      subjects: {},
      weakTopics: []
    };

    const overallAccuracy = stat.totalAttempted > 0 
      ? Number(((stat.totalCorrect / stat.totalAttempted) * 100).toFixed(1)) 
      : 0;

    const overallPercentage = stat.totalPossibleScore > 0 
      ? Number(((stat.totalScore / stat.totalPossibleScore) * 100).toFixed(1)) 
      : 0;

    const avgScore = stat.totalExams > 0 
      ? Number((stat.totalScore / stat.totalExams).toFixed(1)) 
      : 0;

    const performanceTier = overallAccuracy >= 70 
      ? 'TOP_PERFORMER' 
      : overallAccuracy >= 40 
      ? 'AVERAGE' 
      : stat.totalExams > 0 ? 'NEEDS_ATTENTION' : 'NOT_EVALUATED';

    // Format subject breakdown for student
    const studentSubjectsFormatted = {};
    Object.keys(stat.subjects).forEach(subName => {
      const sObj = stat.subjects[subName];
      const acc = sObj.attempted > 0 ? Number(((sObj.correct / sObj.attempted) * 100).toFixed(1)) : 0;
      const pct = sObj.totalPossibleMarks > 0 ? Number(((sObj.marksObtained / sObj.totalPossibleMarks) * 100).toFixed(1)) : 0;
      studentSubjectsFormatted[subName] = {
        subject: subName,
        totalQuestions: sObj.totalQuestions,
        attempted: sObj.attempted,
        correct: sObj.correct,
        wrong: sObj.wrong,
        marksObtained: sObj.marksObtained,
        totalPossibleMarks: sObj.totalPossibleMarks,
        accuracy: acc,
        percentage: pct,
        status: acc >= 70 ? 'STRONG' : acc >= 40 ? 'AVERAGE' : 'WEAK',
        weakTopicsCount: stat.weakTopics.filter(w => w.subject?.toLowerCase() === subName.toLowerCase()).length
      };

      // Tally subject global tiers
      const gSub = subjectStatsMap.get(subName);
      if (gSub) {
        if (acc >= 70) gSub.strongCount += 1;
        else if (acc >= 40) gSub.averageCount += 1;
        else gSub.weakCount += 1;
      }
    });

    return {
      _id: st._id,
      firstName: st.firstName,
      lastName: st.lastName,
      email: st.email,
      rollNo: st.metadata?.rollNo || '',
      isActive: st.isActive,
      totalExams: stat.totalExams,
      totalDpps: stat.totalDpps,
      avgScore,
      totalScore: stat.totalScore,
      overallAccuracy,
      overallPercentage,
      performanceTier,
      latestExam: stat.exams[0] || null,
      exams: stat.exams,
      subjects: studentSubjectsFormatted,
      weakTopicsCount: stat.weakTopics.length,
      weakTopics: stat.weakTopics
    };
  });

  // Calculate batch-level exam summaries
  const examsList = Array.from(examStatsMap.values()).map(e => ({
    examId: e.examId,
    title: e.title,
    examType: e.examType,
    date: e.date,
    totalMarks: e.totalMarks,
    submissionsCount: e.submissionsCount,
    attendanceRate: students.length > 0 ? Number(((e.submissionsCount / students.length) * 100).toFixed(1)) : 0,
    averageScore: e.submissionsCount > 0 ? Number((e.totalScoreSum / e.submissionsCount).toFixed(1)) : 0,
    highestScore: e.highestScore !== -Infinity ? e.highestScore : 0,
    lowestScore: e.lowestScore !== Infinity ? e.lowestScore : 0,
    averageAccuracy: e.submissionsCount > 0 ? Number((e.accuraciesSum / e.submissionsCount).toFixed(1)) : 0
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate subject-level summaries
  const subjectsSummary = Array.from(subjectStatsMap.values()).map(s => {
    const weakList = Array.from(s.weakTopicsMap.entries())
      .map(([topic, count]) => ({ topic, affectedStudentsCount: count }))
      .sort((a, b) => b.affectedStudentsCount - a.affectedStudentsCount);

    const batchAvgAcc = s.totalAttempted > 0 ? Number(((s.totalCorrect / s.totalAttempted) * 100).toFixed(1)) : 0;
    const batchAvgScore = s.evaluatedStudents.size > 0 ? Number((s.totalScore / s.evaluatedStudents.size).toFixed(1)) : 0;

    return {
      subject: s.subject,
      evaluatedStudentsCount: s.evaluatedStudents.size,
      batchAverageAccuracy: batchAvgAcc,
      batchAverageScore: batchAvgScore,
      totalQuestionsAttempted: s.totalAttempted,
      strongStudentsCount: s.strongCount,
      averageStudentsCount: s.averageCount,
      weakStudentsCount: s.weakCount,
      weakTopicsCount: weakList.length,
      topWeakTopics: weakList.slice(0, 5)
    };
  });

  // Overall batch statistics
  const evaluatedCount = studentsList.filter(s => s.totalExams > 0).length;
  const totalScoreSum = studentsList.reduce((acc, s) => acc + s.totalScore, 0);
  const totalExamsSum = studentsList.reduce((acc, s) => acc + s.totalExams, 0);
  const batchAvgScore = totalExamsSum > 0 ? Number((totalScoreSum / totalExamsSum).toFixed(1)) : 0;
  const accuraciesList = studentsList.filter(s => s.totalExams > 0).map(s => s.overallAccuracy);
  const batchAvgAccuracy = accuraciesList.length > 0 
    ? Number((accuraciesList.reduce((a, b) => a + b, 0) / accuraciesList.length).toFixed(1)) 
    : 0;

  const performanceTiers = {
    top: studentsList.filter(s => s.performanceTier === 'TOP_PERFORMER').length,
    average: studentsList.filter(s => s.performanceTier === 'AVERAGE').length,
    needsAttention: studentsList.filter(s => s.performanceTier === 'NEEDS_ATTENTION').length,
    notEvaluated: studentsList.filter(s => s.performanceTier === 'NOT_EVALUATED').length
  };

  return {
    batch: batchDoc ? {
      _id: batchDoc._id,
      name: batchDoc.name,
      section: batchDoc.section,
      totalStudents: students.length
    } : { _id: 'all', name: 'All Batches', totalStudents: students.length },
    overall: {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.isActive !== false).length,
      evaluatedStudentsCount: evaluatedCount,
      totalExamsConducted: examIds.length,
      batchAverageScore: batchAvgScore,
      batchAverageAccuracy: batchAvgAccuracy,
      performanceTiers
    },
    examsList,
    subjects: subjectsSummary,
    students: studentsList,
    totalEvaluatedStudents: evaluatedCount
  };
};

