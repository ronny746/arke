const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnlineExam',
    required: true,
  },
  type: {
    type: String,
    enum: ['MCQ', 'TRUE_FALSE', 'SUBJECTIVE'],
    default: 'MCQ',
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionCategory'
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionChapter'
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionTopic'
  },
  questionText: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  questionImageUrl: {
    type: String, // from S3
  },
  options: [{
    text: String,
    imageUrl: String,
    isCorrect: {
      type: Boolean,
      default: false,
    }
  }],
  correctAnswerText: {
    type: String, // For True/False or subjective reference
  },
  explanation: {
    type: String, // from [Sol] tag
    default: '',
  },
  marks: {
    type: Number,
    default: 4,
  },
  negativeMarks: {
    type: Number,
    default: 1,
  },
  order: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Optional: compound index to quickly fetch all questions of an exam in order
examQuestionSchema.index({ exam: 1, order: 1 });

module.exports = mongoose.models.ExamQuestion || mongoose.model('ExamQuestion', examQuestionSchema);
