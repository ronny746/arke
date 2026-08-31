const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'email', 'number', 'textarea', 'select', 'date'],
    required: true 
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // Used for 'select' type
  placeholder: { type: String }
});

const formSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, required: true },
  description: { type: String },
  fields: [fieldSchema],
  isActive: { type: Boolean, default: true },
  publicId: { type: String, required: true, unique: true }, // Short unique ID for public link
  successMessage: { type: String, default: 'Thank you! Your submission has been received.' }
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);
