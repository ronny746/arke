const BatchService = require('./batches.service');
const { successResponse } = require('../../common/responses');

exports.createBatch = async (req, res, next) => {
  try {
    const data = await BatchService.createBatch(req.user, req.body);
    return successResponse(res, 'Batch created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getBatches = async (req, res, next) => {
  try {
    const data = await BatchService.getBatches(req.user, req.query);
    return successResponse(res, 'Batches retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getMyBatches = async (req, res, next) => {
  try {
    const data = await BatchService.getMyBatches(req.user);
    return successResponse(res, 'My batches retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getBatchById = async (req, res, next) => {
  try {
    const data = await BatchService.getBatchById(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Batch not found' });
    return successResponse(res, 'Batch retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const data = await BatchService.updateBatch(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Batch not found' });
    return successResponse(res, 'Batch updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.assignToBatch = async (req, res, next) => {
  try {
    const data = await BatchService.assignToBatch(req.params.id, req.body.userIds, req.body.roleInBatch, req.user);
    return successResponse(res, 'Users assigned successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignClass = async (req, res, next) => {
  try {
    const data = await BatchService.bulkAssignClass(req.params.id, req.body.targetClass, req.body.targetSection, req.user);
    return successResponse(res, `Students assigned to batch successfully`, data);
  } catch (error) {
    next(error);
  }
};
exports.syncStudentBatches = async (req, res, next) => {
  try {
    const data = await BatchService.syncStudentBatches(req.body.studentId, req.body.batchIds, req.user);
    return successResponse(res, 'Student batches synced successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.joinBatch = async (req, res, next) => {
  try {
    const data = await BatchService.joinBatch(req.body.batchId, req.user);
    return successResponse(res, 'Successfully joined the batch', data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBatch = async (req, res, next) => {
  try {
    const data = await BatchService.deleteBatch(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Batch not found' });
    return successResponse(res, 'Batch deleted successfully', data);
  } catch (error) {
    next(error);
  }
};
