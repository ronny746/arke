const mongoose = require('mongoose');

function slugifyCourseName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'course';
}

// A course students can see/buy: active, published and not ended.
const liveCourseQuery = () => ({
  isActive: true,
  isPublished: { $ne: false },
  $or: [
    { endDate: { $exists: false } },
    { endDate: null },
    { endDate: { $gt: new Date() } }
  ]
});

const courseSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  name: { type: String, required: true },
  // Public, human-readable course URL segment. It is intentionally not unique
  // because names are scoped to an institute, while the public catalog can
  // contain courses from more than one institute.
  slug: { type: String, index: true },
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
    // The Subject Library is the canonical academic catalogue. Course records
    // keep course-specific workload/teacher overrides but never invent a
    // separate subject identity.
    librarySubjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
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

courseSchema.pre('validate', function ensureCourseSlug(next) {
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = slugifyCourseName(this.name);
  }
  next();
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
module.exports.slugifyCourseName = slugifyCourseName;
module.exports.liveCourseQuery = liveCourseQuery;
