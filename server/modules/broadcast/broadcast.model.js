const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  // Add fields here
}, { timestamps: true });

module.exports = mongoose.model('broadcast', schema);
