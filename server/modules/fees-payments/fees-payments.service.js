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

  return await FeeRecord.find(query)
    .populate('studentId', 'firstName lastName email')
    .populate('courseId', 'name')
    .populate('batchId', 'name section')
    .sort({ dueDate: 1 });
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

const BatchModel = require('../batches/batches.model');

exports.getTransactions = async (reqUser, filters = {}) => {
  const query = {};

  const currentUserId = reqUser.userId || reqUser.id || reqUser._id;

  if (reqUser.role === 'student') {
    query.studentId = currentUserId;
  } else if (reqUser.role === 'parent') {
    const parentId = currentUserId;
    const UserModel = require('../users/users.model');
    const parentUser = await UserModel.findById(parentId);
    const childIds = parentUser?.childrenIds || reqUser.childrenIds || [];
    query.studentId = { $in: childIds };
  } else {
    // Admin / Operations / Staff
    if (reqUser.role !== 'super_super_admin' && reqUser.instituteId) {
      query.instituteId = reqUser.instituteId;
    }
    if (filters.studentId) {
      query.studentId = filters.studentId;
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const rawTxns = await PaymentTransaction.find(query)
    .populate('studentId', 'firstName lastName email phone metadata')
    .populate('courseId', 'name fee')
    .populate('batchId', 'name section')
    .populate({
      path: 'feeRecordId',
      populate: [
        { path: 'batchId', select: 'name section' },
        { path: 'courseId', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  if (rawTxns.length === 0) {
    const feeRecordQuery = {};
    if (reqUser.role === 'student') {
      feeRecordQuery.studentId = reqUser.userId || reqUser.id;
    } else if (reqUser.role === 'parent') {
      const parentId = reqUser.userId || reqUser.id;
      const UserModel = require('../users/users.model');
      const parentUser = await UserModel.findById(parentId);
      const childIds = parentUser?.childrenIds || reqUser.childrenIds || [];
      feeRecordQuery.studentId = { $in: childIds };
    } else {
      if (reqUser.role !== 'super_super_admin' && reqUser.instituteId) {
        feeRecordQuery.instituteId = reqUser.instituteId;
      }
      if (filters.studentId) {
        feeRecordQuery.studentId = filters.studentId;
      }
    }

    const feeRecords = await FeeRecord.find(feeRecordQuery)
      .populate('studentId', 'firstName lastName email phone metadata')
      .populate('courseId', 'name fee')
      .populate('batchId', 'name section')
      .sort({ createdAt: -1 })
      .lean();

    return feeRecords.map(f => {
      const b = f.batchId;
      const c = f.courseId;
      return {
        _id: f._id,
        transactionId: `REC_${f._id.toString().slice(-8).toUpperCase()}`,
        studentId: f.studentId,
        courseId: c,
        batchId: b,
        courseName: c?.name || 'General Course Enrollment',
        batchName: b ? `${b.name}${b.section ? ' (Sec ' + b.section + ')' : ''}` : 'Enrolled Batch',
        amountPaid: f.amountPaid || f.amountDue || 0,
        paymentMethod: 'ONLINE',
        createdAt: f.createdAt || f.dueDate,
        status: f.status === 'PAID' ? 'SUCCESS' : f.status
      };
    });
  }

  const populatedTxns = await Promise.all(rawTxns.map(async (txn) => {
    // Auto-resolve pending Easebuzz transactions
    if (txn.status === 'PENDING' && txn.transactionId) {
      try {
        const easebuzzService = require('../payments/easebuzz.service');
        const userEmail = txn.studentId?.email || '';
        const userPhone = txn.studentId?.phone || '';
        const amount = txn.amountPaid || 0;
        const apiRes = await easebuzzService.retrieveTransaction(txn.transactionId, amount, userEmail, userPhone);

        if (apiRes && apiRes.status === 1 && apiRes.data) {
          const rawData = Array.isArray(apiRes.data) ? apiRes.data[0] : apiRes.data;
          const apiStatus = (rawData?.status || '').toLowerCase().trim();

          if (['success', 'successful', 'userpaid', 'user_paid'].includes(apiStatus)) {
            txn.status = 'SUCCESS';
            txn.gatewayStatus = rawData.status;
            await PaymentTransaction.updateOne({ _id: txn._id }, {
              status: 'SUCCESS',
              gatewayStatus: rawData.status,
              easepayid: rawData.easepayid || txn.easepayid,
              bankRefNum: rawData.bank_ref_num || txn.bankRefNum
            });
            if (txn.courseId?._id && txn.studentId?._id) {
              const PaymentsService = require('../payments/payments.service');
              await PaymentsService.fulfillCourseEnrollment(txn.courseId._id, txn.studentId._id, txn.instituteId, txn.batchId, txn);
            }
          } else if (['usercancelled', 'user_cancelled', 'failure', 'failed', 'invalid'].includes(apiStatus)) {
            txn.status = 'FAILED';
            txn.gatewayStatus = rawData.status;
            await PaymentTransaction.updateOne({ _id: txn._id }, {
              status: 'FAILED',
              gatewayStatus: rawData.status
            });
          }
        } else {
          // Timeout fallback for pending transactions older than 15 minutes
          const isOlderThan15Min = txn.createdAt && (Date.now() - new Date(txn.createdAt).getTime() > 15 * 60 * 1000);
          if (isOlderThan15Min) {
            txn.status = 'FAILED';
            txn.gatewayStatus = 'timeout_cancelled';
            await PaymentTransaction.updateOne({ _id: txn._id }, {
              status: 'FAILED',
              gatewayStatus: 'timeout_cancelled'
            });
          }
        }
      } catch (err) {
        console.warn('[getTransactions] Pending transaction status check error:', err.message);
      }
    }

    let resolvedBatch = txn.batchId || txn.feeRecordId?.batchId;
    let resolvedCourse = txn.courseId || txn.feeRecordId?.courseId;

    if (!resolvedBatch && txn.studentId?._id) {
      const studentId = txn.studentId._id;
      const batchQuery = { students: studentId };
      if (resolvedCourse?._id) {
        batchQuery.courseId = resolvedCourse._id;
      }
      const foundBatch = await BatchModel.findOne(batchQuery).select('name section').lean();
      if (foundBatch) {
        resolvedBatch = foundBatch;
      }
    }

    return {
      ...txn,
      courseId: resolvedCourse,
      batchId: resolvedBatch,
      courseName: resolvedCourse?.name || 'General Course Enrollment',
      batchName: resolvedBatch ? `${resolvedBatch.name}${resolvedBatch.section ? ' (Sec ' + resolvedBatch.section + ')' : ''}` : 'Enrolled Batch'
    };
  }));

  return populatedTxns;
};
