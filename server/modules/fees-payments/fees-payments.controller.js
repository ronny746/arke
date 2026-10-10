const FeesPaymentsService = require('./fees-payments.service');
const { successResponse } = require('../../common/responses');

exports.generateFee = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.generateFee(req.user, req.body);
    return successResponse(res, 'Fee generated successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getFees = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.getFees(req.user, req.query);
    return successResponse(res, 'Fees retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getMyDues = async (req, res, next) => {
  try {
    const filters = { ...req.query, status: { $ne: 'PAID' } };
    const data = await FeesPaymentsService.getFees(req.user, filters);
    return successResponse(res, 'Pending dues retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildFees = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view fees for this student.' });
      }
    }

    const data = await FeesPaymentsService.getFees(req.user, filters);
    return successResponse(res, 'Child fees retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.processPayment = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.processPayment(req.user, req.body);
    return successResponse(res, 'Payment processed successfully', data, null, 201);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.getTransactions(req.user, req.query);
    return successResponse(res, 'Transactions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.createOrUpdateCustomPlan = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.createOrUpdateCustomPlan(req.user, req.body);
    return successResponse(res, 'Custom fee installment plan saved successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.recordOfflinePayment = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.recordOfflinePayment(req.user, req.body);
    return successResponse(res, data.message || 'Offline payment recorded successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.sendPaymentReminder = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.sendPaymentReminder(req.user, req.body);
    return successResponse(res, data.message || 'Payment reminder sent successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getCoursePlan = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.query;
    const data = await FeesPaymentsService.getCoursePlan(req.user, courseId, studentId);
    return successResponse(res, 'Course fee plan retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getCustomPlans = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.getCustomPlans(req.user, req.query);
    return successResponse(res, 'Installment plans retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.checkAndSendDueReminders = async (req, res, next) => {
  try {
    const data = await FeesPaymentsService.checkAndSendDueReminders(req.user.instituteId);
    return successResponse(res, 'Due reminders checked and sent', data);
  } catch (error) {
    next(error);
  }
};

