const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, unique: true },
  academicYear: { type: String, required: true, default: "2025-2026" }, // e.g. "2025-2026"
  activeTerm: { type: String }, // e.g. "Term 1"
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} }, // JSON blob for UI/Timezone preferences
  authSettings: {
    enableRollNumberLogin: { type: Boolean, default: true }, // legacy, unused
    // Students may also sign in with Roll No / mobile + password.
    enableStudentPasswordLogin: { type: Boolean, default: false }
  },
  performanceSettings: {
    redBelow: { type: Number, default: 40, min: 0, max: 99 },
    yellowBelow: { type: Number, default: 70, min: 1, max: 100 }
  },
  appUpdate: {
    latestVersion: { type: String, default: "1.0.0" },
    minRequiredVersion: { type: String, default: "1.0.0" },
    isMandatory: { type: Boolean, default: false },
    updateUrl: { type: String, default: "https://play.google.com/store/apps/details?id=com.arkescholarsneet.online" },
    updateNotes: { type: String, default: "New version available with enhanced performance and features!" }
  },
  // Expected JEE Main percentile: JEE Main marks (out of 300) vs percentile
  // rows and the g value for each paper level. Empty = built-in defaults
  // (server/modules/exams/jee-percentile.js). Update the table every year
  // after JEE Main Session 1 results.
  jeePercentileConfig: {
    table: [{ _id: false, marks: Number, percentile: Number }],
    gValues: {
      1: { type: Number },
      2: { type: Number },
      3: { type: Number },
      4: { type: Number },
      5: { type: Number }
    }
  },
  // One entry per app version: what changed, so the team can retest exactly
  // those points. Shown in the app under "What's new".
  releaseNotes: [{
    _id: false,
    version: { type: String, trim: true },
    date: { type: Date },
    notes: [{ type: String, trim: true }]
  }],
  neetExamConfig: {
    examTitle: { type: String, default: "NEET UG 2026" },
    examDate: { type: Date, default: () => new Date("2026-05-03T10:00:00.000Z") },
    targetDateLabel: { type: String, default: "Expected May 2026 (Tentative)" },
    isTentative: { type: Boolean, default: true },
    startDate: { type: Date, default: () => new Date("2025-06-01T00:00:00.000Z") },
    subtitle: { type: String, default: "Stay focused. Every day brings you closer to your dream medical college! 🎯" },
    daysLabel: { type: String, default: "DAYS LEFT" }
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
