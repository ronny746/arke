const PracticeSession = require('../practice/practice-session.model');
const QuestionBank = require('../exams/question-bank.model');
const mongoose = require('mongoose');
const { getTopicFlag } = require('./portal.rules');

function toSessionQuestion(question, index) {
  return {
    questionId: question._id?.toString() || `remedial_${index}`,
    questionText: question.questionText,
    type: question.type || 'MCQ',
    difficulty: question.difficulty || 'Easy',
    subjectName: question.subjectName || 'General',
    topicName: question.topicName || 'General',
    marks: question.marks ?? 4,
    negativeMarks: question.negativeMarks ?? 1,
    options: question.options || [],
    correctAnswerText: question.correctAnswerText || '',
    explanation: question.explanation || ''
  };
}

exports.createRemedialSessions = async ({ instituteId, studentId, examId, topicScores, thresholds }) => {
  const redTopics = topicScores.filter(topic => getTopicFlag(topic.percentage, thresholds) === 'RED');
  if (!redTopics.length) return [];

  const priorSessions = await PracticeSession.find({ student: studentId, linkedExamId: examId, sessionType: 'DPP' }).select('filters.topic').lean();
  const alreadyAssignedTopics = new Set(priorSessions.map(session => session.filters?.topic).filter(Boolean));
  const sessions = [];

  for (const topic of redTopics) {
    if (alreadyAssignedTopics.has(topic.topicName)) continue;
    const questions = await QuestionBank.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      { $unwind: '$questions' },
      { $match: {
        'questions.subjectName': topic.subjectName,
        'questions.topicName': topic.topicName,
        'questions.isUnpublished': { $ne: true }
      } },
      { $sample: { size: 5 } }
    ]);
    const sessionQuestions = questions.map(({ questions: question }, index) => toSessionQuestion(question, index));
    if (!sessionQuestions.length) continue;

    sessions.push(await PracticeSession.create({
      student: studentId,
      institute: instituteId,
      sessionType: 'DPP',
      title: `Remedial: ${topic.subjectName} - ${topic.topicName}`,
      linkedExamId: examId,
      filters: { subject: topic.subjectName, topic: topic.topicName, difficulty: 'Easy' },
      questions: sessionQuestions,
      totalQuestions: sessionQuestions.length,
      totalMarks: sessionQuestions.reduce((total, question) => total + question.marks, 0)
    }));
  }

  return sessions;
};
