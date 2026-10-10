const FlagService = require('./performance-flags.service');
const { successResponse } = require('../../common/responses');

exports.getMine = async (req, res, next) => {
  try { return successResponse(res, 'Topic performance flags retrieved successfully', await FlagService.getMyFlags(req.user.userId, req.query)); } catch (error) { next(error); }
};

exports.getChild = async (req, res, next) => {
  try { return successResponse(res, 'Child topic performance flags retrieved successfully', await FlagService.getChildFlags(req.user.userId, req.params.childId, req.query)); } catch (error) { next(error); }
};

exports.getBatch = async (req, res, next) => {
  try { return successResponse(res, 'Batch topic flags retrieved successfully', await FlagService.getBatchFlags(req.user.userId, req.user.instituteId, req.params.batchId)); } catch (error) { next(error); }
};

exports.getStudentFlags = async (req, res, next) => {
  try {
    return successResponse(
      res,
      'Student topic performance flags retrieved successfully',
      await FlagService.getMyFlags(req.params.studentId, req.query)
    );
  } catch (error) {
    next(error);
  }
};
