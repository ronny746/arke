const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  title: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
