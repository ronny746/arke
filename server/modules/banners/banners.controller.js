const BannerService = require('./banners.service');
const { successResponse } = require('../../common/responses');

exports.createBanner = async (req, res, next) => {
  try {
    const data = await BannerService.createBanner(req.user, req.body);
    return successResponse(res, 'Banner created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getBanners = async (req, res, next) => {
  try {
    const data = await BannerService.getAllBanners(req.user);
    return successResponse(res, 'Banners retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getActiveBanners = async (req, res, next) => {
  try {
    const data = await BannerService.getActiveBanners();
    return successResponse(res, 'Active banners retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateBanner = async (req, res, next) => {
  try {
    const data = await BannerService.updateBanner(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Banner not found' });
    return successResponse(res, 'Banner updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    const data = await BannerService.deleteBanner(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Banner not found' });
    return successResponse(res, 'Banner deleted successfully', data);
  } catch (error) {
    next(error);
  }
};
