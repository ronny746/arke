const broadcastService = require('./broadcast.service');
const { successResponse, errorResponse } = require('../../common/responses');

// exports.getAll = async (req, res, next) => {
//   try {
//     const data = await broadcastService.getAll(req.user);
//     return successResponse(res, 'Success', data);
//   } catch (error) {
//     next(error);
//   }
// };
