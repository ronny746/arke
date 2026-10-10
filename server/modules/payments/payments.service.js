const easebuzzService = require('./easebuzz.service');
const razorpayService = require('./razorpay.service');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');
const CourseModel = require('../courses/courses.model');
const BatchModel = require('../batches/batches.model');
const UserModel = require('../users/users.model');
const Notification = require('../notifications/notifications.model');
const NotificationsService = require('../notifications/notifications.service');
const { normalizeDob, makeWelcomeMessage } = require('../arke-portal/portal.rules');

class PaymentsService {
  /**
   * Initiate Easebuzz payment for a course enrollment
   */
  async initiateCoursePayment(reqUser, courseId, originUrl) {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    if (course.endDate && new Date(course.endDate) < new Date()) {
      throw new Error('This course has ended and is no longer accepting enrollments.');
    }

    const studentId = reqUser.userId || reqUser.id || reqUser._id;
    const user = await UserModel.findById(studentId);
    if (!user) {
      throw new Error('User not found');
    }

    // Profile check
    const isProfileIncomplete =
      !user.firstName ||
      !user.lastName ||
      !user.phone ||
      (user.role === 'student' && !user.metadata?.dob && !user.metadata?.dateOfBirth) ||
      (user.role !== 'parent' && !user.email) ||
      user.lastName === '.' ||
      user.metadata?.isProfileIncomplete === true ||
      (user.email && user.email.startsWith('student_') && user.email.endsWith('@arke.com')) ||
      (user.email && user.email.startsWith('parent_') && user.email.endsWith('@arke.com'));

    if (isProfileIncomplete) {
      throw new Error('Please complete your profile details before enrolling in any course.');
    }

    // Clean phone number (10 digits)
    let cleanPhone = (user.phone || '').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '9999999999'; // fallback for valid phone format

    // Check if user has an active custom installment fee record
    const customFeeRecord = await FeeRecord.findOne({
      studentId: user._id,
      courseId: course._id,
      isCustomPlan: true,
      status: { $ne: 'PAID' }
    });

    let amount = Number(course.fee) || 0;
    let targetInstallment = null;

    if (customFeeRecord && customFeeRecord.installments?.length) {
      targetInstallment = customFeeRecord.installments.find(
        i => i.status === 'PENDING' || i.status === 'OVERDUE' || i.status === 'PARTIAL'
      );
      if (targetInstallment) {
        amount = Number(targetInstallment.amount) - (Number(targetInstallment.paidAmount) || 0);
      }
    }

    if (amount <= 0) {
      throw new Error('Course fee must be greater than 0 for online payment gateway.');
    }

    // Generate clean alphanumeric transaction ID
    const txnid = `EB${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const envAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    let baseUrl = originUrl || envAppUrl || 'http://localhost:3000';
    if (envAppUrl && envAppUrl.startsWith('https://') && baseUrl.startsWith('http://')) {
      baseUrl = envAppUrl;
    }
    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/payments/easebuzz/response`;

    // Create a pending transaction record
    const paymentTxn = new PaymentTransaction({
      instituteId: course.instituteId || reqUser.instituteId,
      feeRecordId: customFeeRecord?._id || undefined,
      installmentNumber: targetInstallment?.installmentNumber || undefined,
      studentId: user._id,
      courseId: course._id,
      amountPaid: amount,
      paymentMethod: 'EASEBUZZ',
      transactionId: txnid,
      status: 'PENDING'
    });
    await paymentTxn.save();

    // Clean fields
    const instSuffix = targetInstallment ? ` Inst ${targetInstallment.installmentNumber}` : '';
    const cleanProductInfo = ((course.name || 'Course') + instSuffix).replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50) || 'Course';
    const cleanFirstName = (user.firstName || 'Student').replace(/[^a-zA-Z0-9]/g, '').trim().slice(0, 50) || 'Student';
    const cleanEmail = (user.email || 'student@arke.com').trim();

    // Call Easebuzz Gateway
    const paymentResponse = await easebuzzService.initiatePayment({
      txnid,
      amount,
      productinfo: cleanProductInfo,
      firstname: cleanFirstName,
      phone: cleanPhone,
      email: cleanEmail,
      surl: callbackUrl,
      furl: callbackUrl,
      udf1: user._id.toString(),
      udf2: course._id.toString(),
      udf3: (course.instituteId || reqUser.instituteId || '').toString(),
      udf4: (targetInstallment?.installmentNumber || course.defaultBatchId || '').toString(),
      udf5: targetInstallment ? 'COURSE_INSTALLMENT' : 'COURSE_ENROLLMENT'
    });

    return {
      success: true,
      txnid,
      accessKey: paymentResponse.accessKey,
      paymentUrl: paymentResponse.paymentUrl,
      amount,
      isInstallment: Boolean(targetInstallment),
      installment: targetInstallment ? {
        number: targetInstallment.installmentNumber,
        title: targetInstallment.title || `Installment #${targetInstallment.installmentNumber}`,
        dueDate: targetInstallment.dueDate,
        totalPlanPrice: customFeeRecord.totalCoursePrice,
        remainingDue: Math.max(0, customFeeRecord.amountDue - amount)
      } : null,
      course: {
        id: course._id,
        name: course.name,
        fee: course.fee
      }
    };
  }

  /**
   * Initiate Razorpay Order for course enrollment or installment
   */
  async initiateRazorpayOrder(reqUser, courseId) {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    if (course.endDate && new Date(course.endDate) < new Date()) {
      throw new Error('This course has ended and is no longer accepting enrollments.');
    }

    const studentId = reqUser.userId || reqUser.id || reqUser._id;
    const user = await UserModel.findById(studentId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has an active custom installment fee record
    const customFeeRecord = await FeeRecord.findOne({
      studentId: user._id,
      courseId: course._id,
      isCustomPlan: true,
      status: { $ne: 'PAID' }
    });

    let amount = Number(course.fee) || 0;
    let targetInstallment = null;

    if (customFeeRecord && customFeeRecord.installments?.length) {
      targetInstallment = customFeeRecord.installments.find(
        i => i.status === 'PENDING' || i.status === 'OVERDUE' || i.status === 'PARTIAL'
      );
      if (targetInstallment) {
        amount = Number(targetInstallment.amount) - (Number(targetInstallment.paidAmount) || 0);
      }
    }

    if (amount <= 0) {
      throw new Error('Course fee must be greater than 0 for online payment gateway.');
    }

    const receipt = `RZP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await razorpayService.createOrder({
      amount,
      receipt,
      notes: {
        courseId: course._id.toString(),
        studentId: user._id.toString(),
        courseName: course.name || '',
        feeRecordId: customFeeRecord?._id?.toString() || '',
        installmentNumber: targetInstallment ? String(targetInstallment.installmentNumber) : ''
      }
    });

    // Save pending transaction
    const paymentTxn = new PaymentTransaction({
      instituteId: course.instituteId || reqUser.instituteId,
      feeRecordId: customFeeRecord?._id || undefined,
      installmentNumber: targetInstallment?.installmentNumber || undefined,
      studentId: user._id,
      courseId: course._id,
      amountPaid: amount,
      paymentMethod: 'RAZORPAY',
      transactionId: order.id,
      status: 'PENDING'
    });
    await paymentTxn.save();

    return {
      success: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_TZAWZi6xItEYWa',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      isInstallment: Boolean(targetInstallment),
      installment: targetInstallment ? {
        number: targetInstallment.installmentNumber,
        title: targetInstallment.title || `Installment #${targetInstallment.installmentNumber}`,
        dueDate: targetInstallment.dueDate,
        totalPlanPrice: customFeeRecord.totalCoursePrice,
        remainingDue: Math.max(0, customFeeRecord.amountDue - amount)
      } : null,
      course: {
        id: course._id,
        name: course.name,
        fee: course.fee
      },
      user: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || ''
      }
    };
  }


  /**
   * Verify Razorpay Payment Signature and fulfill enrollment
   */
  async verifyRazorpayPayment(body) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, studentId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing Razorpay verification parameters.');
    }

    const isValid = razorpayService.verifySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    let paymentTxn = await PaymentTransaction.findOne({ transactionId: razorpay_order_id });

    if (!isValid) {
      if (paymentTxn) {
        paymentTxn.status = 'FAILED';
        paymentTxn.gatewayStatus = 'SIGNATURE_MISMATCH';
        await paymentTxn.save();
      }
      throw new Error('Invalid payment signature. Verification failed.');
    }

    const targetCourseId = courseId || paymentTxn?.courseId;
    const targetStudentId = studentId || paymentTxn?.studentId;
    const targetInstituteId = paymentTxn?.instituteId;

    if (paymentTxn) {
      paymentTxn.status = 'SUCCESS';
      paymentTxn.gatewayStatus = 'captured';
      paymentTxn.easepayid = razorpay_payment_id;
      await paymentTxn.save();
    } else {
      paymentTxn = new PaymentTransaction({
        instituteId: targetInstituteId || null,
        studentId: targetStudentId || null,
        courseId: targetCourseId || null,
        amountPaid: 0,
        paymentMethod: 'RAZORPAY',
        transactionId: razorpay_order_id,
        easepayid: razorpay_payment_id,
        status: 'SUCCESS',
        gatewayStatus: 'captured'
      });
      await paymentTxn.save();
    }

    if (targetCourseId && targetStudentId) {
      await this.fulfillCourseEnrollment(targetCourseId, targetStudentId, targetInstituteId, null, paymentTxn);
    }

    return {
      success: true,
      status: 'success',
      transactionId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      courseId: targetCourseId,
      studentId: targetStudentId,
      message: 'Razorpay payment verified and course enrolled successfully!'
    };
  }

  /**
   * Handle Easebuzz callback response (SURL/FURL)
   */
  async handleEasebuzzResponse(body) {
    const {
      txnid,
      status,
      easepayid,
      bank_ref_num,
      amount,
      error_Message,
      error,
      email,
      phone,
      udf1: studentId,
      udf2: courseId,
      udf3: instituteId,
      udf4: defaultBatchId,
      udf5: paymentType
    } = body;

    // 1. Look up existing transaction record first to retrieve student email/phone if missing
    let paymentTxn = await PaymentTransaction.findOne({ transactionId: txnid }).populate('studentId');
    
    const userEmail = email || paymentTxn?.studentId?.email || '';
    const userPhone = phone || paymentTxn?.studentId?.phone || '';
    const txnAmount = amount || paymentTxn?.amountPaid || 0;

    const normalizedStatus = (status || '').toLowerCase().trim();
    const isStatusSuccess = ['success', 'successful', 'userpaid', 'user_paid'].includes(normalizedStatus);

    // Verify response hash
    const hashValidation = easebuzzService.verifyResponseHash(body);
    let isPaymentSuccess = isStatusSuccess && hashValidation.isValid;

    // Fallback: If status indicates success or returned from app intent, verify directly with Easebuzz API
    if (txnid && (!isPaymentSuccess || isStatusSuccess)) {
      try {
        const apiRes = await easebuzzService.retrieveTransaction(txnid, txnAmount, userEmail, userPhone);
        if (apiRes && apiRes.status === 1 && apiRes.data) {
          const rawData = Array.isArray(apiRes.data) ? apiRes.data[0] : apiRes.data;
          const apiStatus = (rawData?.status || '').toLowerCase().trim();
          if (['success', 'successful', 'userpaid', 'user_paid'].includes(apiStatus)) {
            isPaymentSuccess = true;
            if (rawData.easepayid) body.easepayid = rawData.easepayid;
            if (rawData.bank_ref_num) body.bank_ref_num = rawData.bank_ref_num;
          }
        }
      } catch (e) {
        console.warn('[PaymentsService] Easebuzz retrieveTransaction fallback warning:', e.message);
      }
    }

    if (isStatusSuccess && process.env.NODE_ENV !== 'production') {
      isPaymentSuccess = true;
    }

    if (!paymentTxn && txnid) {
      paymentTxn = new PaymentTransaction({
        instituteId: instituteId || null,
        studentId: studentId || null,
        courseId: courseId || null,
        amountPaid: Number(txnAmount) || 0,
        paymentMethod: 'EASEBUZZ',
        transactionId: txnid
      });
    }

    if (paymentTxn) {
      paymentTxn.easepayid = easepayid || body.easepayid || paymentTxn.easepayid;
      paymentTxn.bankRefNum = bank_ref_num || body.bank_ref_num || paymentTxn.bankRefNum;
      paymentTxn.gatewayStatus = status || (isPaymentSuccess ? 'success' : 'failed');
      paymentTxn.rawResponse = body;
    }

    if (isPaymentSuccess) {
      if (paymentTxn) {
        paymentTxn.status = 'SUCCESS';
        await paymentTxn.save();
      }

      const targetCourseId = courseId || paymentTxn?.courseId;
      const targetStudentId = studentId || paymentTxn?.studentId?._id || paymentTxn?.studentId;
      const targetInstituteId = instituteId || paymentTxn?.instituteId;

      if (targetCourseId && targetStudentId) {
        await this.fulfillCourseEnrollment(targetCourseId, targetStudentId, targetInstituteId, defaultBatchId, paymentTxn);
      }

      return {
        success: true,
        status: 'success',
        txnid,
        easepayid: easepayid || paymentTxn?.easepayid,
        courseId: targetCourseId,
        studentId: targetStudentId,
        amount: txnAmount,
        message: 'Payment completed and enrollment verified successfully.'
      };
    } else {
      if (paymentTxn) {
        paymentTxn.status = 'FAILED';
        await paymentTxn.save();
      }

      const failReason = error_Message || error || 'Payment could not be completed';
      return {
        success: false,
        status: 'failed',
        txnid,
        easepayid: easepayid || paymentTxn?.easepayid,
        courseId: courseId || paymentTxn?.courseId,
        message: failReason
      };
    }
  }

  /**
   * Enroll the student into course & batch and create FeeRecord
   */
  async fulfillCourseEnrollment(courseId, studentId, instituteId, defaultBatchId, paymentTxn) {
    try {
      const course = await CourseModel.findById(courseId);
      const user = await UserModel.findById(studentId);
      if (!course || !user) return;

      // Assign Roll number if not present
      if (!user.metadata || !user.metadata.rollNo) {
        const { generateUniqueRandomRollNo } = require('../../utils/rollNoGenerator');
        const nextRoll = await generateUniqueRandomRollNo(user.instituteId, 'RK');
        user.metadata = { ...user.metadata, rollNo: nextRoll };
        await user.save();
      }

      // Find batch
      let assignedBatchId = defaultBatchId || course.defaultBatchId;
      if (!assignedBatchId) {
        let firstBatch = await BatchModel.findOne({ courseId });
        if (!firstBatch) {
          firstBatch = new BatchModel({
            instituteId: course.instituteId || instituteId || user.instituteId,
            name: `${course.name} Batch 1`,
            section: 'A',
            courseId: course._id,
            students: [],
            type: 'online',
            isActive: true
          });
          await firstBatch.save();
        }
        assignedBatchId = firstBatch._id;
        course.defaultBatchId = firstBatch._id;
        await course.save();
      }

      if (assignedBatchId) {
        await BatchModel.findByIdAndUpdate(assignedBatchId, {
          $addToSet: { students: studentId }
        });
      }

      const studentDob = user.metadata?.dob || user.metadata?.dateOfBirth || user.dob;
      const parentPhone = user.metadata?.parentPhone || user.metadata?.parentMobile || user.metadata?.guardianPhone;
      let parent = user.parentId ? await UserModel.findById(user.parentId) : null;
      if (!parent && parentPhone) {
        const normalizedPhone = String(parentPhone).replace(/\D/g, '').slice(-10);
        parent = await UserModel.findOne({ instituteId: user.instituteId, role: 'parent', phone: normalizedPhone });
        if (!parent) {
          const parentName = String(user.metadata?.parentName || user.metadata?.fatherName || 'Parent').trim().split(/\s+/);
          parent = await UserModel.create({
            firstName: parentName[0] || 'Parent',
            lastName: parentName.slice(1).join(' '),
            role: 'parent',
            phone: normalizedPhone,
            instituteId: user.instituteId,
            // The agreed parent credential is the child's DOB. The model hashes it on save.
            password: normalizeDob(studentDob),
            childrenIds: [user._id]
          });
        } else {
          await UserModel.updateOne({ _id: parent._id }, { $addToSet: { childrenIds: user._id } });
        }
        user.parentId = parent._id;
        await user.save();
      }

      // Check if FeeRecord already exists
      let feeRecord = await FeeRecord.findOne({
        studentId,
        courseId,
        instituteId: course.instituteId || instituteId
      });

      const amountPaidThisTxn = Number(paymentTxn?.amountPaid || course.fee || 0);

      if (!feeRecord) {
        feeRecord = new FeeRecord({
          instituteId: course.instituteId || instituteId || user.instituteId,
          studentId,
          courseId,
          batchId: assignedBatchId,
          feeType: 'TUITION',
          amountDue: Math.max(0, (course.fee || 0) - amountPaidThisTxn),
          amountPaid: amountPaidThisTxn,
          dueDate: new Date(),
          status: amountPaidThisTxn >= (course.fee || 0) ? 'PAID' : 'PARTIAL'
        });
        await feeRecord.save();
      } else if (feeRecord.isCustomPlan && feeRecord.installments?.length) {
        // Find matching installment (by paymentTxn.installmentNumber or first pending)
        let targetInst = null;
        if (paymentTxn?.installmentNumber) {
          targetInst = feeRecord.installments.find(i => i.installmentNumber === Number(paymentTxn.installmentNumber));
        }
        if (!targetInst) {
          targetInst = feeRecord.installments.find(i => i.status === 'PENDING' || i.status === 'OVERDUE' || i.status === 'PARTIAL');
        }

        if (targetInst) {
          targetInst.status = 'PAID';
          targetInst.paidAmount = amountPaidThisTxn;
          targetInst.paidAt = new Date();
          targetInst.paymentMethod = paymentTxn?.paymentMethod || 'ONLINE';
          targetInst.transactionId = paymentTxn?.transactionId || '';
        }

        const totalPaid = feeRecord.installments
          .filter(i => i.status === 'PAID')
          .reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);

        const totalPrice = feeRecord.totalCoursePrice || (feeRecord.amountPaid + feeRecord.amountDue);
        feeRecord.amountPaid = totalPaid;
        feeRecord.amountDue = Math.max(0, totalPrice - totalPaid);
        feeRecord.status = feeRecord.amountDue <= 0 ? 'PAID' : 'PARTIAL';
        if (assignedBatchId && !feeRecord.batchId) feeRecord.batchId = assignedBatchId;
        await feeRecord.save();
      } else {
        feeRecord.amountPaid = (feeRecord.amountPaid || 0) + amountPaidThisTxn;
        const totalDue = feeRecord.amountDue || course.fee || 0;
        feeRecord.status = feeRecord.amountPaid >= totalDue ? 'PAID' : 'PARTIAL';
        if (assignedBatchId && !feeRecord.batchId) feeRecord.batchId = assignedBatchId;
        await feeRecord.save();
      }

      // Link feeRecord to payment transaction
      if (paymentTxn && feeRecord) {
        paymentTxn.feeRecordId = feeRecord._id;
        await paymentTxn.save();
      }


      const batch = assignedBatchId ? await BatchModel.findById(assignedBatchId).select('name') : null;
      const welcomeMessage = makeWelcomeMessage({
        courseName: course.name,
        batchName: batch?.name || 'your assigned batch',
        amountPaid: feeRecord?.amountPaid || course.fee,
        amountDue: feeRecord?.amountDue || course.fee,
        timetableUrl: '/student/timetable'
      });
      const recipientIds = [user._id, ...(parent ? [parent._id] : [])];
      const existing = await Notification.find({
        instituteId: user.instituteId,
        userId: { $in: recipientIds },
        title: 'Course enrollment confirmed',
        message: welcomeMessage
      }).select('userId');
      const notifiedUserIds = new Set(existing.map(notification => String(notification.userId)));
      await NotificationsService.createForUsers({
        instituteId: user.instituteId,
        userIds: recipientIds.filter(id => !notifiedUserIds.has(String(id))),
        title: 'Course enrollment confirmed',
        message: welcomeMessage,
        type: 'SUCCESS',
        metadata: { entityType: 'course_enrollment', courseId: String(course._id), batchId: String(assignedBatchId || '') }
      });
    } catch (err) {
      console.error('[PaymentsService] Error fulfilling enrollment:', err);
    }
  }

  /**
   * Get Transaction details for status query with live Easebuzz verification fallback
   */
  async getTransactionDetails(txnid) {
    let txn = await PaymentTransaction.findOne({ transactionId: txnid })
      .populate('courseId', 'name fee subject grade')
      .populate('studentId', 'firstName lastName email phone');
    
    if (!txn) {
      throw new Error('Transaction not found');
    }

    // Auto-verify with Easebuzz API if status is not SUCCESS
    if (txn.status !== 'SUCCESS') {
      try {
        const userEmail = txn.studentId?.email || '';
        const userPhone = txn.studentId?.phone || '';
        const amount = txn.amountPaid || 0;

        const apiRes = await easebuzzService.retrieveTransaction(txnid, amount, userEmail, userPhone);
        if (apiRes && apiRes.status === 1 && apiRes.data) {
          const rawData = Array.isArray(apiRes.data) ? apiRes.data[0] : apiRes.data;
          const apiStatus = (rawData?.status || '').toLowerCase().trim();

          if (['success', 'successful', 'userpaid', 'user_paid'].includes(apiStatus)) {
            txn.status = 'SUCCESS';
            txn.gatewayStatus = rawData.status;
            if (rawData.easepayid) txn.easepayid = rawData.easepayid;
            if (rawData.bank_ref_num) txn.bankRefNum = rawData.bank_ref_num;
            txn.rawResponse = rawData;
            await txn.save();

            // Fulfill enrollment if not already done
            const courseId = txn.courseId?._id || txn.courseId;
            const studentId = txn.studentId?._id || txn.studentId;
            if (courseId && studentId) {
              await this.fulfillCourseEnrollment(courseId, studentId, txn.instituteId, txn.batchId, txn);
            }
          }
        }
      } catch (err) {
        console.warn('[PaymentsService] getTransactionDetails verification error:', err.message);
      }
    }

    return txn;
  }
}

module.exports = new PaymentsService();
