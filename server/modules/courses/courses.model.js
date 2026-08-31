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
  access: {
    liveClasses: { type: Boolean, default: true },
    studyMaterials: { type: Boolean, default: true },
    dpps: { type: Boolean, default: true },
    testSeries: { type: Boolean, default: true }
  },
  defaultBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

courseSchema.index({ instituteId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
