const BannerModel = require('./banners.model');

exports.createBanner = async (reqUser, payload) => {
  const banner = new BannerModel({
    ...payload,
    instituteId: reqUser ? reqUser.instituteId : undefined
  });
  return await banner.save();
};

exports.getAllBanners = async (reqUser) => {
  const query = {};
  if (reqUser && reqUser.role !== 'super_super_admin' && reqUser.instituteId) {
    query.$or = [{ instituteId: reqUser.instituteId }, { instituteId: { $exists: false } }];
  }
  return await BannerModel.find(query).sort({ order: 1, createdAt: -1 });
};

exports.getActiveBanners = async () => {
  return await BannerModel.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
};

exports.updateBanner = async (id, payload, reqUser) => {
  return await BannerModel.findByIdAndUpdate(id, payload, { new: true });
};

exports.deleteBanner = async (id, reqUser) => {
  return await BannerModel.findByIdAndDelete(id);
};
