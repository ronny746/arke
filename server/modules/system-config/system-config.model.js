const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, unique: true },
  academicYear: { type: String, required: true }, // e.g. "2026-2027"
  activeTerm: { type: String }, // e.g. "Term 1"
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} } // JSON blob for UI/Timezone preferences
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
