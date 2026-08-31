const easebuzzService = require('./easebuzz.service');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');
const CourseModel = require('../courses/courses.model');
const BatchModel = require('../batches/batches.model');
const UserModel = require('../users/users.model');

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
      (user.role !== 'parent' && !user.email) ||
      user.lastName === '.' ||
      user.metadata?.isProfileIncomplete === true ||
      (user.email && user.email.startsWith('student_') && user.email.endsWith('@skd.com')) ||
      (user.email && user.email.startsWith('parent_') && user.email.endsWith('@skd.com'));

    if (isProfileIncomplete) {
      throw new Error('Please complete your profile details before enrolling in any course.');
    }

    // Clean phone number (10 digits)
    let cleanPhone = (user.phone || '').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '9999999999'; // fallback for valid phone format

    const amount = Number(course.fee) || 0;
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
      studentId: user._id,
      courseId: course._id,
      amountPaid: amount,
      paymentMethod: 'EASEBUZZ',
      transactionId: txnid,
      status: 'PENDING'
    });
    await paymentTxn.save();

    // Clean fields
    const cleanProductInfo = (course.name || 'Course').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50) || 'Course';
    const cleanFirstName = (user.firstName || 'Student').replace(/[^a-zA-Z0-9]/g, '').trim().slice(0, 50) || 'Student';
    const cleanEmail = (user.email || 'student@skd.com').trim();

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
      udf4: (course.defaultBatchId || '').toString(),
      udf5: 'COURSE_ENROLLMENT'
    });

    return {
      success: true,
      txnid,
      accessKey: paymentResponse.accessKey,
      paymentUrl: paymentResponse.paymentUrl,
      amount,
      course: {
        id: course._id,
        name: course.name,
        fee: course.fee
      }
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
        const skdCount = await UserModel.countDocuments({ "metadata.rollNo": { $regex: /^SKD/i } });
        const nextSkdRoll = `SKD${skdCount + 1}`;
        user.metadata = { ...user.metadata, rollNo: nextSkdRoll };
        await user.save();
      }

      // Find batch
      let assignedBatchId = defaultBatchId || course.defaultBatchId;
      if (!assignedBatchId) {
        const firstBatch = await BatchModel.findOne({ courseId });
        if (firstBatch) {
          assignedBatchId = firstBatch._id;
          course.defaultBatchId = firstBatch._id;
          await course.save();
        }
      }

      if (assignedBatchId) {
        await BatchModel.findByIdAndUpdate(assignedBatchId, {
          $addToSet: { students: studentId }
        });
      }

      // Check if FeeRecord already exists
      let feeRecord = await FeeRecord.findOne({
        studentId,
        courseId,
        instituteId: course.instituteId || instituteId
      });

      if (!feeRecord) {
        feeRecord = new FeeRecord({
          instituteId: course.instituteId || instituteId || user.instituteId,
          studentId,
          courseId,
          batchId: assignedBatchId,
          feeType: 'TUITION',
          amountDue: course.fee || 0,
          amountPaid: course.fee || 0,
          dueDate: new Date(),
          status: 'PAID'
        });
        await feeRecord.save();
      } else {
        feeRecord.amountPaid = (feeRecord.amountPaid || 0) + (course.fee || 0);
        feeRecord.status = 'PAID';
        if (assignedBatchId && !feeRecord.batchId) feeRecord.batchId = assignedBatchId;
        await feeRecord.save();
      }

      // Link feeRecord to payment transaction
      if (paymentTxn && feeRecord) {
        paymentTxn.feeRecordId = feeRecord._id;
        await paymentTxn.save();
      }
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
