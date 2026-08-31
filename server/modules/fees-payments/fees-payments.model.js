const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feeType: { type: String, enum: ['TUITION', 'TRANSPORT', 'EXAM', 'OTHER'], default: 'TUITION' },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID'], default: 'PENDING' }
}, { timestamps: true });

const paymentTransactionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'], required: true },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' }
}, { timestamps: true });

const FeeRecord = mongoose.model('FeeRecord', feeRecordSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = { FeeRecord, PaymentTransaction };
