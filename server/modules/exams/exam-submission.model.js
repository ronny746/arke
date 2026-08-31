const mongoose = require('mongoose');

const examSubmissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnlineExam',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true, // Optional now for public users
  },
  publicUser: {
    name: String,
    email: String,
    phone: String,
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'REJECTED'], // REJECTED for cheating
    default: 'IN_PROGRESS',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamQuestion',
    },
    selectedOptionId: {
      type: mongoose.Schema.Types.ObjectId, // For MCQs
    },
    subjectiveAnswerText: {
      type: String, // For Subjective
    },
    status: {
      type: String,
      enum: ['ANSWERED', 'NOT_ANSWERED', 'MARKED_FOR_REVIEW', 'ANSWERED_AND_MARKED_FOR_REVIEW'],
      default: 'NOT_ANSWERED'
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    default: 0,
  },
  totalCorrect: {
    type: Number,
    default: 0,
  },
  totalWrong: {
    type: Number,
    default: 0,
  },
  totalUnattempted: {
    type: Number,
    default: 0,
  },
  violations: {
    tabSwitches: {
      type: Number,
      default: 0,
    },
    fullScreenExits: {
      type: Number,
      default: 0,
    },
    otherWarnings: [{
      message: String,
      timestamp: Date
    }]
  }
}, { timestamps: true });

// Removed strict unique index to allow multiple public submissions (where student is null/undefined)
// We will handle duplicate checks logically or use a sparse index if needed.
// examSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.models.ExamSubmission || mongoose.model('ExamSubmission', examSubmissionSchema);
