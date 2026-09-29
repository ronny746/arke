const express = require('express');
const router = express.Router();
const CourseModel = require('./courses.model');

// Public route to get all active courses
router.get('/', async (req, res, next) => {
  try {
    const query = {
      isActive: true, 
      isPublished: { $ne: false },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: new Date() } }
      ]
    };
    if (req.query.instituteId) {
      query.instituteId = req.query.instituteId;
    }
    if (req.query.targetExam && req.query.targetExam !== 'ALL') {
      query.$or = [
        { targetExam: req.query.targetExam },
        { targetExam: 'ALL' },
        { targetExam: { $exists: false } },
        { targetExams: req.query.targetExam },
        { targetExams: 'ALL' }
      ];
    }
    if (req.query.targetClass && req.query.targetClass !== 'ALL') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { targetClass: req.query.targetClass },
          { targetClass: 'ALL' },
          { targetClass: { $exists: false } },
          { targetClasses: req.query.targetClass },
          { targetClasses: 'ALL' }
        ]
      });
    }
    if (req.query.medium && req.query.medium !== 'ALL') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { medium: req.query.medium },
          { medium: 'ALL' },
          { medium: { $exists: false } }
        ]
      });
    }
    const courses = await CourseModel.find(query)
      .populate('faculties', 'firstName lastName email phone profilePictureUrl metadata role')
      .sort({ updatedAt: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
});

// Public route to get a single course by id
router.get('/:id', async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const course = await CourseModel.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublished: { $ne: false },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: new Date() } }
      ]
    }).populate('faculties', 'firstName lastName email phone profilePictureUrl metadata role');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// Public route to get exams for a course
router.get('/:id/exams', async (req, res, next) => {
  try {
    const CourseService = require('./courses.service');
    // Extract token if present
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        user = decoded;
      } catch (e) {}
    }
    const data = await CourseService.getCourseExams(req.params.id, user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
