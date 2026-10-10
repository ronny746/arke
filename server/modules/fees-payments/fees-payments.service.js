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

const CourseModel = require('../courses/courses.model');
const UserModel = require('../users/users.model');
const NotificationsService = require('../notifications/notifications.service');

/**
 * Admin creates or updates custom installment fee plan for a student
 */
exports.createOrUpdateCustomPlan = async (reqUser, payload) => {
  const { studentId, courseId, batchId, totalCoursePrice, installments, notes } = payload;
  const instituteId = reqUser.instituteId;

  const [student, course] = await Promise.all([
    UserModel.findById(studentId),
    CourseModel.findById(courseId)
  ]);

  if (!student) throw new Error('Student not found');
  if (!course) throw new Error('Course not found');

  const price = Number(totalCoursePrice);
  if (!price || price <= 0) {
    throw new Error('Total course price must be greater than zero');
  }

  // Validate installment amounts sum
  const sumInstallments = (installments || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  if (Math.round(sumInstallments) !== Math.round(price)) {
    throw new Error(`Total of installments (₹${sumInstallments.toLocaleString()}) must match custom course price (₹${price.toLocaleString()})`);
  }

  let feeRecord = await FeeRecord.findOne({
    studentId,
    courseId,
    instituteId: instituteId || course.instituteId
  });

  // Preserve any previously paid installments
  const existingPaidMap = new Map();
  if (feeRecord?.installments?.length) {
    feeRecord.installments.forEach(inst => {
      if (inst.status === 'PAID') {
        existingPaidMap.set(inst.installmentNumber, inst);
      }
    });
  }

  const sortedInstallments = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  const formattedInstallments = sortedInstallments.map((inst, index) => {
    const instNum = inst.installmentNumber || (index + 1);
    const existing = existingPaidMap.get(instNum);
    if (existing) {
      return {
        installmentNumber: instNum,
        title: inst.title || existing.title || `Installment #${instNum}`,
        amount: Number(inst.amount),
        dueDate: new Date(inst.dueDate),
        status: 'PAID',
        paidAmount: existing.paidAmount || Number(inst.amount),
        paidAt: existing.paidAt || new Date(),
        paymentMethod: existing.paymentMethod || 'MANUAL',
        transactionId: existing.transactionId || '',
        remarks: existing.remarks || inst.remarks || '',
        recordedBy: existing.recordedBy || reqUser.userId || reqUser.id
      };
    }
    return {
      installmentNumber: instNum,
      title: inst.title || `Installment #${instNum}`,
      amount: Number(inst.amount),
      dueDate: new Date(inst.dueDate),
      status: 'PENDING',
      paidAmount: 0,
      remarks: inst.remarks || ''
    };
  });

  const totalPaid = formattedInstallments
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);

  const amountDue = Math.max(0, price - totalPaid);
  const status = amountDue <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');
  const assignedBatchId = batchId || feeRecord?.batchId || course.defaultBatchId;

  if (feeRecord) {
    feeRecord.totalCoursePrice = price;
    feeRecord.amountDue = amountDue;
    feeRecord.amountPaid = totalPaid;
    feeRecord.dueDate = formattedInstallments[0]?.dueDate || new Date();
    feeRecord.status = status;
    feeRecord.isCustomPlan = true;
    feeRecord.installments = formattedInstallments;
    feeRecord.notes = notes || feeRecord.notes;
    if (assignedBatchId) feeRecord.batchId = assignedBatchId;
    await feeRecord.save();
  } else {
    feeRecord = new FeeRecord({
      instituteId: instituteId || course.instituteId || student.instituteId,
      studentId,
      courseId,
      batchId: assignedBatchId,
      feeType: 'TUITION',
      totalCoursePrice: price,
      amountDue,
      amountPaid: totalPaid,
      dueDate: formattedInstallments[0]?.dueDate || new Date(),
      status,
      isCustomPlan: true,
      installments: formattedInstallments,
      createdBy: reqUser.userId || reqUser.id,
      notes: notes || ''
    });
    await feeRecord.save();
  }

  // Notify student and parent about newly created / updated installment plan
  try {
    const parent = student.parentId ? await UserModel.findById(student.parentId) : null;
    const recipientIds = [student._id, ...(parent ? [parent._id] : [])];
    const firstDue = formattedInstallments[0]?.dueDate
      ? new Date(formattedInstallments[0].dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Immediate';

    await NotificationsService.createForUsers({
      instituteId: feeRecord.instituteId,
      userIds: recipientIds,
      title: 'Course Fee Installment Plan Configured',
      message: `A custom plan of ₹${price.toLocaleString()} in ${formattedInstallments.length} installments has been set for "${course.name}". Installment #1 (₹${formattedInstallments[0]?.amount.toLocaleString()}) is due on ${firstDue}.`,
      type: 'INFO',
      metadata: {
        entityType: 'fee_plan_created',
        feeRecordId: String(feeRecord._id),
        courseId: String(course._id)
      }
    });
  } catch (notifErr) {
    console.warn('[createOrUpdateCustomPlan] Notification error:', notifErr.message);
  }

  return feeRecord;
};

/**
 * Record an offline payment for an installment (Cash, Cheque, Bank Transfer, UPI)
 */
exports.recordOfflinePayment = async (reqUser, payload) => {
  const { feeRecordId, installmentNumber, amountPaid, paymentMethod, transactionId, paidAt, remarks } = payload;
  const adminId = reqUser.userId || reqUser.id || reqUser._id;

  const feeRecord = await FeeRecord.findById(feeRecordId)
    .populate('courseId', 'name defaultBatchId')
    .populate('studentId', 'firstName lastName email phone parentId instituteId');

  if (!feeRecord) throw new Error('Fee record not found');

  const instNum = Number(installmentNumber);
  const targetInst = (feeRecord.installments || []).find(i => i.installmentNumber === instNum);
  if (!targetInst) {
    throw new Error(`Installment #${instNum} not found in this fee plan`);
  }

  const amt = Number(amountPaid);
  if (amt <= 0) throw new Error('Amount paid must be greater than zero');

  // Mark installment as paid
  targetInst.status = 'PAID';
  targetInst.paidAmount = amt;
  targetInst.paidAt = paidAt ? new Date(paidAt) : new Date();
  targetInst.paymentMethod = paymentMethod || 'CASH';
  targetInst.transactionId = transactionId || `OFFL_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  targetInst.remarks = remarks || '';
  targetInst.recordedBy = adminId;

  // Recalculate feeRecord totals
  const totalPaid = feeRecord.installments
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);

  const totalPrice = feeRecord.totalCoursePrice || (feeRecord.amountPaid + feeRecord.amountDue);
  feeRecord.amountPaid = totalPaid;
  feeRecord.amountDue = Math.max(0, totalPrice - totalPaid);
  feeRecord.status = feeRecord.amountDue <= 0 ? 'PAID' : 'PARTIAL';
  await feeRecord.save();

  // Create audit payment transaction
  const paymentTxn = new PaymentTransaction({
    instituteId: feeRecord.instituteId,
    feeRecordId: feeRecord._id,
    installmentNumber: instNum,
    studentId: feeRecord.studentId?._id || feeRecord.studentId,
    courseId: feeRecord.courseId?._id || feeRecord.courseId,
    batchId: feeRecord.batchId,
    amountPaid: amt,
    paymentMethod: `OFFLINE_${paymentMethod || 'CASH'}`,
    transactionId: targetInst.transactionId,
    gatewayStatus: 'RECORDED_BY_ADMIN',
    rawResponse: { remarks, recordedBy: adminId, paidAt: targetInst.paidAt },
    status: 'SUCCESS'
  });
  await paymentTxn.save();

  // Automatically fulfill batch enrollment if this is installment 1 or first payment
  try {
    const PaymentsService = require('../payments/payments.service');
    const courseId = feeRecord.courseId?._id || feeRecord.courseId;
    const studentId = feeRecord.studentId?._id || feeRecord.studentId;
    await PaymentsService.fulfillCourseEnrollment(courseId, studentId, feeRecord.instituteId, feeRecord.batchId, paymentTxn);
  } catch (enrollErr) {
    console.warn('[recordOfflinePayment] Auto-enrollment error:', enrollErr.message);
  }

  // Notify student and parent with receipt
  try {
    const student = feeRecord.studentId;
    const parent = student?.parentId ? await UserModel.findById(student.parentId) : null;
    const recipientIds = [student?._id, ...(parent ? [parent._id] : [])].filter(Boolean);

    await NotificationsService.createForUsers({
      instituteId: feeRecord.instituteId,
      userIds: recipientIds,
      title: 'Offline Payment Receipt Acknowledged',
      message: `Payment of ₹${amt.toLocaleString()} for Installment #${instNum} of "${feeRecord.courseId?.name || 'Course'}" has been recorded via ${paymentMethod}. Remaining due: ₹${feeRecord.amountDue.toLocaleString()}. Receipt Ref: ${targetInst.transactionId}`,
      type: 'SUCCESS',
      metadata: {
        entityType: 'fee_payment_receipt',
        feeRecordId: String(feeRecord._id),
        installmentNumber: instNum,
        transactionId: targetInst.transactionId
      }
    });
  } catch (notifErr) {
    console.warn('[recordOfflinePayment] Notification error:', notifErr.message);
  }

  return {
    feeRecord,
    paymentTransaction: paymentTxn,
    message: `Installment #${instNum} marked as paid successfully!`
  };
};

/**
 * Send payment due reminder to student and parent
 */
exports.sendPaymentReminder = async (reqUser, payload) => {
  const { feeRecordId, installmentNumber } = payload;

  const feeRecord = await FeeRecord.findById(feeRecordId)
    .populate('courseId', 'name')
    .populate('studentId', 'firstName lastName email phone parentId instituteId');

  if (!feeRecord) throw new Error('Fee record not found');

  let targetInst;
  if (installmentNumber) {
    targetInst = (feeRecord.installments || []).find(i => i.installmentNumber === Number(installmentNumber));
  } else {
    targetInst = (feeRecord.installments || []).find(i => i.status === 'PENDING' || i.status === 'OVERDUE' || i.status === 'PARTIAL');
  }

  if (!targetInst) {
    throw new Error('No pending installment found to send reminder for');
  }

  const student = feeRecord.studentId;
  const parent = student?.parentId ? await UserModel.findById(student.parentId) : null;
  const recipientIds = [student?._id, ...(parent ? [parent._id] : [])].filter(Boolean);

  const formattedDate = targetInst.dueDate
    ? new Date(targetInst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'immediately';

  const isOverdue = targetInst.dueDate && new Date(targetInst.dueDate) < new Date();
  const alertTitle = isOverdue
    ? `⚠️ Overdue Fee Alert: Installment #${targetInst.installmentNumber}`
    : `📅 Fee Payment Due Reminder: Installment #${targetInst.installmentNumber}`;

  const alertMessage = `Installment #${targetInst.installmentNumber} of ₹${targetInst.amount.toLocaleString()} for "${feeRecord.courseId?.name || 'Course'}" is ${isOverdue ? 'OVERDUE since' : 'due on'} ${formattedDate}. Please complete payment to avoid disruption in course access.`;

  await NotificationsService.createForUsers({
    instituteId: feeRecord.instituteId,
    userIds: recipientIds,
    title: alertTitle,
    message: alertMessage,
    type: 'ALERT',
    metadata: {
      entityType: 'fee_reminder',
      feeRecordId: String(feeRecord._id),
      installmentNumber: targetInst.installmentNumber,
      dueDate: targetInst.dueDate,
      amount: targetInst.amount
    }
  });

  feeRecord.lastReminderSentAt = new Date();
  await feeRecord.save();

  return {
    success: true,
    message: `Reminder sent to ${recipientIds.length} recipient(s) successfully!`,
    sentTo: {
      student: `${student?.firstName || ''} ${student?.lastName || ''}`.trim(),
      parent: parent ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : null
    }
  };
};

/**
 * Get active student fee plan for a specific course
 */
exports.getCoursePlan = async (reqUser, courseId, queryStudentId) => {
  let targetStudentId;

  if (reqUser.role === 'student') {
    targetStudentId = reqUser.userId || reqUser.id;
  } else if (reqUser.role === 'parent') {
    const parentUser = await UserModel.findById(reqUser.userId || reqUser.id);
    const childIds = parentUser?.childrenIds || reqUser.childrenIds || [];
    targetStudentId = queryStudentId && childIds.includes(queryStudentId) ? queryStudentId : childIds[0];
  } else {
    // Admin
    targetStudentId = queryStudentId;
  }

  if (!targetStudentId) {
    return null;
  }

  const feeRecord = await FeeRecord.findOne({
    studentId: targetStudentId,
    courseId
  })
    .populate('courseId', 'name fee actualFee')
    .populate('studentId', 'firstName lastName email phone metadata')
    .populate('batchId', 'name section');

  return feeRecord;
};

/**
 * Get all custom installment plans for institute (Admin view)
 */
exports.getCustomPlans = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.instituteId && reqUser.role !== 'super_super_admin') {
    query.instituteId = reqUser.instituteId;
  }

  query.isCustomPlan = true;

  if (filters.status && filters.status !== 'ALL') {
    query.status = filters.status;
  }

  if (filters.courseId) {
    query.courseId = filters.courseId;
  }

  if (filters.studentId) {
    query.studentId = filters.studentId;
  }

  const plans = await FeeRecord.find(query)
    .populate('studentId', 'firstName lastName email phone metadata')
    .populate('courseId', 'name fee actualFee')
    .populate('batchId', 'name section')
    .sort({ updatedAt: -1 })
    .lean();

  return plans;
};

/**
 * Automated due reminder scanner (e.g. for installments due within 3 days or overdue)
 */
exports.checkAndSendDueReminders = async (instituteId) => {
  const query = {
    isCustomPlan: true,
    status: { $ne: 'PAID' }
  };
  if (instituteId) query.instituteId = instituteId;

  const records = await FeeRecord.find(query)
    .populate('courseId', 'name')
    .populate('studentId', 'firstName lastName email phone parentId');

  const now = new Date();
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let remindersSent = 0;

  for (const record of records) {
    // Check if reminded in the last 24 hours
    if (record.lastReminderSentAt && (now.getTime() - new Date(record.lastReminderSentAt).getTime() < 24 * 60 * 60 * 1000)) {
      continue;
    }

    const pendingInst = (record.installments || []).find(inst => {
      if (inst.status === 'PAID') return false;
      const d = new Date(inst.dueDate);
      // Due within next 3 days or overdue by at most 14 days
      return d <= threeDaysAhead && (now.getTime() - d.getTime() <= 14 * 24 * 60 * 60 * 1000);
    });

    if (pendingInst) {
      try {
        const student = record.studentId;
        const parent = student?.parentId ? await UserModel.findById(student.parentId) : null;
        const recipientIds = [student?._id, ...(parent ? [parent._id] : [])].filter(Boolean);

        const isOverdue = new Date(pendingInst.dueDate) < now;
        const alertTitle = isOverdue
          ? `⚠️ Overdue Fee Alert: Installment #${pendingInst.installmentNumber}`
          : `📅 Fee Payment Due in 3 Days: Installment #${pendingInst.installmentNumber}`;

        const alertMessage = `Installment #${pendingInst.installmentNumber} of ₹${pendingInst.amount.toLocaleString()} for "${record.courseId?.name || 'Course'}" is ${isOverdue ? 'OVERDUE' : 'due soon'} (${new Date(pendingInst.dueDate).toLocaleDateString()}). Please make payment on time.`;

        await NotificationsService.createForUsers({
          instituteId: record.instituteId,
          userIds: recipientIds,
          title: alertTitle,
          message: alertMessage,
          type: 'ALERT',
          metadata: {
            entityType: 'fee_due_reminder',
            feeRecordId: String(record._id),
            installmentNumber: pendingInst.installmentNumber
          }
        });

        record.lastReminderSentAt = now;
        await record.save();
        remindersSent++;
      } catch (err) {
        console.warn('[checkAndSendDueReminders] Error sending reminder:', err.message);
      }
    }
  }

  return { success: true, remindersSent };
};

