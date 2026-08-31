const BatchModel = require('../modules/batches/batches.model');
const { errorResponse } = require('../common/responses');

/**
 * Middleware to check if the student has purchased a course that includes a specific feature.
 * @param {string} feature - e.g., 'liveClasses', 'studyMaterials', 'dpps', 'testSeries'
 */
const checkAccess = (feature) => {
  return async (req, res, next) => {
    try {
      // Allow if not a student (teachers, admins, etc. bypass this check)
      if (req.user.role !== 'student' && req.user.role !== 'STUDENT') {
        return next();
      }

      // Fetch all batches the student is enrolled in, populated with course access
      const batches = await BatchModel.find({ students: req.user.userId }).populate('courseId', 'access');
      
      let hasAccess = false;
      for (const batch of batches) {
        if (batch.courseId && batch.courseId.access && batch.courseId.access[feature]) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        const featureNames = {
          liveClasses: 'Live Classes',
          studyMaterials: 'Study Materials',
          dpps: 'DPPs',
          testSeries: 'Test Series'
        };
        const featureName = featureNames[feature] || feature;
        return errorResponse(res, `You do not have access to ${featureName} in your current plan.`, null, 403);
      }

      next();
    } catch (err) {
      console.error('Access Check Error:', err);
      return errorResponse(res, 'Internal Server Error during access check', null, 500);
    }
  };
};

module.exports = {
  checkAccess
};
