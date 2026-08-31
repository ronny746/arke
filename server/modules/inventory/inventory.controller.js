const InventoryService = require('./inventory.service');
const { successResponse } = require('../../common/responses');

exports.addItem = async (req, res, next) => {
  try {
    const data = await InventoryService.addItem(req.user, req.body);
    return successResponse(res, 'Inventory item added successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const data = await InventoryService.getItems(req.user);
    return successResponse(res, 'Inventory items retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.issueItem = async (req, res, next) => {
  try {
    const data = await InventoryService.issueItem(req.user, req.body);
    return successResponse(res, 'Item issued successfully', data, null, 201);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('stock')) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

exports.returnItem = async (req, res, next) => {
  try {
    const data = await InventoryService.returnItem(req.params.id, req.user);
    return successResponse(res, 'Item returned successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
