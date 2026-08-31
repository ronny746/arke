const RecycleBinService = require('./recycle-bin.service');

exports.getDeletedItems = async (req, res, next) => {
  try {
    const items = await RecycleBinService.getDeletedItems(req.user);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("RECYCLE BIN ERROR:", error);
    next(error);
  }
};

exports.restoreItem = async (req, res, next) => {
  try {
    const { modelName, id } = req.body;
    if (!modelName || !id) {
      return res.status(400).json({ success: false, message: 'modelName and id are required' });
    }
    const restored = await RecycleBinService.restoreItem(modelName, id, req.user);
    res.status(200).json({ success: true, message: 'Item restored successfully', data: restored });
  } catch (error) {
    next(error);
  }
};

exports.permanentlyDeleteItem = async (req, res, next) => {
  try {
    const { modelName, id } = req.body;
    if (!modelName || !id) {
      return res.status(400).json({ success: false, message: 'modelName and id are required' });
    }
    await RecycleBinService.permanentlyDeleteItem(modelName, id, req.user);
    res.status(200).json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    next(error);
  }
};
