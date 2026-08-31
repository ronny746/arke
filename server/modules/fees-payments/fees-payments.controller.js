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
