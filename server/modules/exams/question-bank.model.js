const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  bankType: {
    type: String,
    enum: ['SUBJECT_WISE', 'FULL_PAPER'],
    default: 'SUBJECT_WISE'
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    questionText: String, // Can store HTML with mathml/images
    subjectName: String,
    chapterName: String,
    topicName: String,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionCategory' },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionChapter' },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionTopic' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    type: { type: String, enum: ['MCQ', 'TRUE_FALSE', 'SUBJECTIVE'], default: 'MCQ' },
    isUnpublished: { type: Boolean, default: false },
    questionImageUrl: String,
    options: [{
      text: String, // Can store HTML with mathml/images
      imageUrl: String,
      isCorrect: { type: Boolean, default: false }
    }],
    correctAnswerText: String,
    explanation: { type: String, default: '' },
    marks: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 }
  }],
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Avoid OverwriteModelError
module.exports = mongoose.models.QuestionBank || mongoose.model('QuestionBank', questionBankSchema);
