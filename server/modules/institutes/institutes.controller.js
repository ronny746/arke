const InstituteService = require('./institutes.service');
const { successResponse } = require('../../common/responses');
const { ROLES } = require('../../config/constants');

exports.create = async (req, res, next) => {
  try {
    const data = await InstituteService.createInstitute(req.body);
    return successResponse(res, 'Institute created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    let data;
    if (req.user.role === ROLES.SUPER_SUPER_ADMIN) {
      data = await InstituteService.getAllInstitutes();
    } else {
      const institute = await InstituteService.getInstituteById(req.user.instituteId);
      data = institute ? [institute] : [];
    }
    return successResponse(res, 'Institutes retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (req.user.role !== ROLES.SUPER_SUPER_ADMIN && req.user.instituteId.toString() !== targetId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const data = await InstituteService.getInstituteById(targetId);
    if (!data) return res.status(404).json({ success: false, message: 'Institute not found' });
    return successResponse(res, 'Institute retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (req.user.role !== ROLES.SUPER_SUPER_ADMIN && req.user.instituteId.toString() !== targetId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const data = await InstituteService.updateInstitute(targetId, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Institute not found' });
    return successResponse(res, 'Institute updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const data = await InstituteService.deleteInstitute(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Institute not found' });
    return successResponse(res, 'Institute deleted successfully', data);
  } catch (error) {
    next(error);
  }
};
