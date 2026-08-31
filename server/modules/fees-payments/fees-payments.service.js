const { FeeRecord, PaymentTransaction } = require('./fees-payments.model');

exports.generateFee = async (reqUser, payload) => {
  const fee = new FeeRecord({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await fee.save();
};

exports.getFees = async (reqUser, filters) => {
  const query = { instituteId: reqUser.instituteId };
  
  // Role-based access filtering
  if (reqUser.role === 'student') {
    query.studentId = reqUser.userId;
  } else if (filters.studentId) {
    query.studentId = filters.studentId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return await FeeRecord.find(query).populate('studentId', 'firstName lastName email').sort({ dueDate: 1 });
};

exports.processPayment = async (reqUser, payload) => {
  const { feeRecordId, amountPaid, paymentMethod, transactionId } = payload;
  
  const feeRecord = await FeeRecord.findOne({ _id: feeRecordId, instituteId: reqUser.instituteId });
  if (!feeRecord) throw new Error('Fee record not found');

  const transaction = new PaymentTransaction({
    instituteId: reqUser.instituteId,
    feeRecordId,
    studentId: feeRecord.studentId,
    amountPaid,
    paymentMethod,
    transactionId,
    status: 'SUCCESS'
  });

  await transaction.save();

  // Update the FeeRecord
  feeRecord.amountPaid += amountPaid;
  if (feeRecord.amountPaid >= feeRecord.amountDue) {
    feeRecord.status = 'PAID';
  } else {
    feeRecord.status = 'PARTIAL';
  }
  await feeRecord.save();

  return transaction;
};
