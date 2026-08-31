const mongoose = require('mongoose');

const practiceSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
  },
  sessionType: {
    type: String,
    enum: ['DPP', 'PRACTICE'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  filters: {
    subject: String,
    topic: String,
    difficulty: String,
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED'],
    default: 'IN_PROGRESS',
  },
  // Rather than just saving ObjectIds and risk original questions being deleted/changed,
  // we embed the question data for a stable snapshot, just like ExamSubmission does.
  questions: [{
    questionId: String, // original ID
    questionText: String,
    type: { type: String }, // e.g., 'MCQ'
    difficulty: String,
    subjectName: String,
    topicName: String,
    marks: Number,
    negativeMarks: Number,
    options: [{
      _id: String, // option ID
      text: String,
      isCorrect: Boolean,
    }],
    correctAnswerText: String,
    explanation: String,
  }],
  answers: [{
    questionId: String,
    selectedOptionId: String,
    status: {
      type: String, // 'NOT_ANSWERED', 'ANSWERED', 'MARKED_FOR_REVIEW'
      default: 'NOT_ANSWERED',
    },
    isCorrect: Boolean,
    timeSpentSeconds: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    default: 0,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  },
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.models.PracticeSession || mongoose.model('PracticeSession', practiceSessionSchema);
