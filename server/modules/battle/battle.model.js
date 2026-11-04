const mongoose = require('mongoose');

const quizBattleSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Quiz Battle'
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    default: 'Host'
  },
  creatorRole: {
    type: String,
    enum: ['student', 'admin', 'teacher'],
    default: 'student'
  },
  mode: {
    type: String,
    enum: ['1v1', 'GROUP'],
    default: '1v1'
  },
  maxParticipants: {
    type: Number,
    default: 2
  },
  status: {
    type: String,
    enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'WAITING',
    index: true
  },
  subjectName: {
    type: String,
    default: 'Mixed'
  },
  chapterName: {
    type: String,
    default: ''
  },
  topicName: {
    type: String,
    default: ''
  },
  questionBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank'
  },
  timePerQuestion: {
    type: Number,
    default: 20 // seconds
  },
  totalQuestions: {
    type: Number,
    default: 5
  },
  questions: [{
    questionText: { type: String, required: true },
    questionImageUrl: { type: String, default: '' },
    options: [{
      text: { type: String, required: true },
      imageUrl: { type: String, default: '' },
      isCorrect: { type: Boolean, default: false }
    }],
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
    marks: { type: Number, default: 100 },
    negativeMarks: { type: Number, default: 0 }
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'student' },
    isHost: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    totalTimeTaken: { type: Number, default: 0 },
    answers: [{
      questionIndex: { type: Number },
      selectedOptionIndex: { type: Number },
      isCorrect: { type: Boolean },
      timeTaken: { type: Number },
      pointsAwarded: { type: Number, default: 0 }
    }],
    joinedAt: { type: Date, default: Date.now }
  }],
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  roundStartTime: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  winner: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    avatar: { type: String },
    score: { type: Number }
  },
  leaderboard: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    avatar: { type: String },
    score: { type: Number },
    rank: { type: Number },
    correctCount: { type: Number },
    accuracy: { type: Number },
    totalTimeTaken: { type: Number }
  }]
}, {
  timestamps: true
});

quizBattleSchema.index({ institute: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.QuizBattle || mongoose.model('QuizBattle', quizBattleSchema);
