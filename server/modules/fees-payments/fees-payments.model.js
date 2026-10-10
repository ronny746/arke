const mongoose = require('mongoose');

const installmentItemSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  title: { type: String, default: '' },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL'],
    default: 'PENDING'
  },
  paidAmount: { type: Number, default: 0 },
  paidAt: { type: Date },
  paymentMethod: { type: String }, // 'RAZORPAY', 'EASEBUZZ', 'CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI'
  transactionId: { type: String },
  remarks: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const feeRecordSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  feeType: { type: String, enum: ['TUITION', 'TRANSPORT', 'EXAM', 'OTHER'], default: 'TUITION' },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID'], default: 'PENDING' },

  // Custom Pricing & Manual Installments
  isCustomPlan: { type: Boolean, default: false },
  totalCoursePrice: { type: Number },
  installments: [installmentItemSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  lastReminderSentAt: { type: Date }
}, { timestamps: true });

feeRecordSchema.index({ instituteId: 1, studentId: 1, courseId: 1 });

const paymentTransactionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord' },
  installmentNumber: { type: Number },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String, default: 'EASEBUZZ' },
  transactionId: { type: String, required: true, unique: true },
  easepayid: { type: String },
  bankRefNum: { type: String },
  gatewayStatus: { type: String },
  rawResponse: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' }
}, { timestamps: true });

paymentTransactionSchema.index({ instituteId: 1, studentId: 1, createdAt: -1 });

const FeeRecord = mongoose.models.FeeRecord || mongoose.model('FeeRecord', feeRecordSchema);
const PaymentTransaction = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = { FeeRecord, PaymentTransaction };

