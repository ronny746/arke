const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  feeType: { type: String, enum: ['TUITION', 'TRANSPORT', 'EXAM', 'OTHER'], default: 'TUITION' },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID'], default: 'PENDING' }
}, { timestamps: true });

const paymentTransactionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord' },
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

const FeeRecord = mongoose.model('FeeRecord', feeRecordSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = { FeeRecord, PaymentTransaction };
