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
    const courses = await CourseModel.find(query).sort({ updatedAt: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
});

// Public route to get a single course by id
router.get('/:id', async (req, res, next) => {
  try {
    const course = await CourseModel.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublished: { $ne: false },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: new Date() } }
      ]
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
