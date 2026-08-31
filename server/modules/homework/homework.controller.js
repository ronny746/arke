const HomeworkService = require('./homework.service');
const { successResponse } = require('../../common/responses');

exports.createHomework = async (req, res, next) => {
  try {
    const data = await HomeworkService.createHomework(req.user, req.body);
    return successResponse(res, 'Homework created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getHomework = async (req, res, next) => {
  try {
    const data = await HomeworkService.getHomework(req.user, req.query);
    return successResponse(res, 'Homework retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getChildHomework = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    if (!filters.studentId) {
      if (!req.user.childrenIds || req.user.childrenIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No children linked to this parent account.' });
      }
      filters.studentId = { $in: req.user.childrenIds };
    } else {
      if (!req.user.childrenIds || !req.user.childrenIds.includes(filters.studentId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view homework for this student.' });
      }
    }

    const BatchModel = require('../batches/batches.model');
    const childClasses = await BatchModel.find({ students: filters.studentId });
    if (childClasses.length === 0) {
      return successResponse(res, 'Child homework retrieved successfully', []);
    }
    filters.batchId = { $in: childClasses.map(c => c._id) };

    const data = await HomeworkService.getHomework(req.user, filters);
    return successResponse(res, 'Child homework retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.submitHomework = async (req, res, next) => {
  try {
    const data = await HomeworkService.submitHomework(req.params.id, req.user);
    return successResponse(res, 'Homework submitted successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};
