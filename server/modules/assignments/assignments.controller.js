const AssignmentService = require('./assignments.service');
const { successResponse } = require('../../common/responses');

exports.createAssignment = async (req, res, next) => {
  try {
    const data = await AssignmentService.createAssignment(req.user, req.body);
    return successResponse(res, 'Assignment created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAssignments = async (req, res, next) => {
  try {
    const data = await AssignmentService.getAssignments(req.user, req.query);
    return successResponse(res, 'Assignments retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildAssignments = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view assignments for this student.' });
      }
    }

    const BatchModel = require('../batches/batches.model');
    const childClasses = await BatchModel.find({ students: filters.studentId });
    if (childClasses.length === 0) {
      return successResponse(res, 'Child assignments retrieved successfully', []);
    }
    filters.batchId = { $in: childClasses.map(c => c._id) };

    const data = await AssignmentService.getAssignments(req.user, filters);
    return successResponse(res, 'Child assignments retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildSubmissions = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view submissions for this student.' });
      }
    }

    const data = await AssignmentService.getChildSubmissions(filters.studentId);
    return successResponse(res, 'Child submissions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const data = await AssignmentService.submitAssignment(req.params.id, req.user, req.body);
    return successResponse(res, 'Assignment submitted successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const data = await AssignmentService.gradeSubmission(req.params.submissionId, req.body);
    return successResponse(res, 'Submission graded successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionsByAssignment = async (req, res, next) => {
  try {
    const data = await AssignmentService.getSubmissionsByAssignment(req.params.id);
    return successResponse(res, 'Submissions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getMySubmissions = async (req, res, next) => {
  try {
    const data = await AssignmentService.getMySubmissions(req.user.userId);
    return successResponse(res, 'My submissions retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
