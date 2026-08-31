const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, unique: true },
  academicYear: { type: String, required: true, default: "2025-2026" }, // e.g. "2025-2026"
  activeTerm: { type: String }, // e.g. "Term 1"
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} }, // JSON blob for UI/Timezone preferences
  authSettings: {
    enableRollNumberLogin: { type: Boolean, default: true }
  },
  appUpdate: {
    latestVersion: { type: String, default: "1.0.0" },
    minRequiredVersion: { type: String, default: "1.0.0" },
    isMandatory: { type: Boolean, default: false },
    updateUrl: { type: String, default: "https://play.google.com/store/apps/details?id=com.skdinstituteneet.online" },
    updateNotes: { type: String, default: "New version available with enhanced performance and features!" }
  },
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
