const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  name: { type: String, required: true },
  description: { type: String },
  tag: { type: String },
  fee: { type: Number },
  actualFee: { type: Number },
  duration: { type: String }, // keeping for backwards compatibility, but we will use dates now
  startDate: { type: Date },
  endDate: { type: Date },
  subtitle: { type: String },
  features: [{ type: String }],
  bestFor: [{ type: String }],
  color: { type: String, default: '#0033a0' },
  badge: { type: String },
  popular: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  targetExam: { type: String, default: 'ALL' },
  targetExams: [{ type: String }],
  targetClass: { type: String, default: 'ALL' },
  targetClasses: [{ type: String }],
  medium: { type: String, default: 'ALL' },
  access: {
    liveClasses: { type: Boolean, default: true },
    studyMaterials: { type: Boolean, default: true },
    dpps: { type: Boolean, default: true },
    testSeries: { type: Boolean, default: true }
  },
  defaultBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  faculties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subjects: [{
    name: { type: String, required: true },
    icon: { type: String, default: '📖' },
    // Course-level subject owner. This is used to grant the assigned teacher
    // access to the course's batches and learners.
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    chaptersCount: { type: Number, default: 0 },
    dppsCount: { type: Number, default: 0 },
    testsCount: { type: Number, default: 0 },
    description: { type: String },
    topics: [{ type: String }]
  }],
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

courseSchema.index({ instituteId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
