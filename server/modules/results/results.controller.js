const ResultsService = require('./results.service');
const { successResponse } = require('../../common/responses');

exports.submitResult = async (req, res, next) => {
  try {
    const data = await ResultsService.submitResult(req.user, req.body);
    return successResponse(res, 'Result submitted successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getResults = async (req, res, next) => {
  try {
    const data = await ResultsService.getResults(req.user, req.query);
    return successResponse(res, 'Results retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildResults = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    // Auto-fetch results for all children if specific studentId is not requested
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      // Security check: ensure requested studentId is actually their child
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view results for this student.' });
      }
    }

    const data = await ResultsService.getResults(req.user, filters);
    return successResponse(res, 'Child results retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
