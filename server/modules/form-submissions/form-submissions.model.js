const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  data: [{
    fieldId: { type: String, required: true },
    label: { type: String, required: true }, // Store label for history in case form changes
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  }],
  status: { 
    type: String, 
    enum: ['NEW', 'IN_PROGRESS', 'CONVERTED', 'REJECTED'], 
    default: 'NEW' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
