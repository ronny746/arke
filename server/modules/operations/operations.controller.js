const service = require('./operations.service');
const { successResponse } = require('../../common/responses');

const send = (fn, message, status = 200) => async (req, res, next) => { try { return successResponse(res, message, await fn(req), null, status); } catch (error) { next(error); } };
exports.requestLeave = send(req => service.requestLeave(req.user, req.body), 'Leave request submitted', 201);
exports.reviewLeave = send(req => service.reviewLeave(req.user, req.params.id, req.body), 'Leave request reviewed');
exports.listLeave = send(req => service.listLeave(req.user, req.query), 'Leave requests retrieved');
exports.createMentors = send(req => service.createMentors(req.user, req.body.mentors), 'Mentors uploaded', 201);
exports.listMentors = send(req => service.listMentors(req.user), 'Mentors retrieved');
exports.scheduleMentorSession = send(req => service.scheduleMentorSession(req.user, req.body), 'Mentor session scheduled', 201);
exports.swapMentor = send(req => service.swapMentor(req.user, req.params.id, req.body.mentorId), 'Mentor reassigned');
