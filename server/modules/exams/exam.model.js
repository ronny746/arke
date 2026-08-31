const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicClass',
  }],
  examType: {
    type: String,
    enum: ['INTERNAL', 'PUBLIC'],
    default: 'INTERNAL'
  },
  settings: {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    passingMarks: {
      type: Number,
      default: 0,
    },
    showResultsAfterSubmit: {
      type: Boolean,
      default: true,
    },
  },
  security: {
    requireFullScreen: {
      type: Boolean,
      default: true,
    },
    disableCopyPaste: {
      type: Boolean,
      default: true,
    },
    maxTabSwitchesAllowed: {
      type: Number,
      default: 3,
    },
    enableProctoring: {
      type: Boolean,
      default: false,
    },
    proctoringIntervalSeconds: {
      type: Number,
      default: 5, // snapshot every 5 seconds
    }
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED'],
    default: 'DRAFT',
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Check if exam is active right now
examSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'PUBLISHED' && now >= this.settings.startTime && now <= this.settings.endTime;
});

// Calculate status string for frontend
examSchema.virtual('scheduleStatus').get(function () {
  const now = new Date();
  if (this.status === 'DRAFT') return 'Draft';
  if (now < this.settings.startTime) return 'Upcoming';
  if (now > this.settings.endTime) return 'Ended';
  return 'Active';
});

examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.OnlineExam || mongoose.model('OnlineExam', examSchema);
