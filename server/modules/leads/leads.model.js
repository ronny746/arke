const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  instituteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Institute', 
    required: true 
  },
  studentName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  studentClass: { type: String },
  parentName: { type: String },
  parentMobile: { type: String },
  city: { type: String },
  inquiryFor: { type: String },
  remarks: { type: String },
  status: { 
    type: String, 
    enum: ['New', 'In-Progress', 'Converted', 'Dead'],
    default: 'New'
  },
  source: { type: String, default: 'Manual' },
  
  // Dynamic Assignment properties
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null // null means it's in the unassigned pool
  },
  claimedAt: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timeline/History
  followUps: [{
    status: { type: String },
    remark: { type: String },
    date: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
