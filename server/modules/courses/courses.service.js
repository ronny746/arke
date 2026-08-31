const CourseModel = require('./courses.model');
const BatchModel = require('../batches/batches.model');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');

exports.createCourse = async (reqUser, payload) => {
  const course = new CourseModel({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await course.save();
};

exports.getCourses = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.role !== 'super_super_admin') {
    query.instituteId = reqUser.instituteId;
  }
  if (reqUser.role === 'student') {
    query.isPublished = { $ne: false };
  }
  return await CourseModel.find(query).sort({ createdAt: -1 });
};

exports.getCourseById = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser && reqUser.role !== 'super_super_admin' && reqUser.role !== 'student') {
    query.instituteId = reqUser.instituteId;
  }
  return await CourseModel.findOne(query);
};

exports.updateCourse = async (id, payload, reqUser) => {
  return await CourseModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  );
};

exports.deleteCourse = async (id, reqUser) => {
  return await CourseModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};

exports.enrollCourse = async (id, reqUser, payload) => {
  const course = await CourseModel.findById(id);
  if (!course) throw new Error('Course not found');
  
  if (course.endDate && new Date(course.endDate) < new Date()) {
    throw new Error('This course has ended and is no longer accepting enrollments.');
  }
  
  const studentId = reqUser.userId || reqUser.id || reqUser._id;
  const UserModel = require('../users/users.model');
  const user = await UserModel.findById(studentId);
  if (!user) throw new Error('User not found');

  const isProfileIncomplete = 
    !user.firstName || 
    !user.lastName || 
    !user.phone || 
    (user.role !== 'parent' && !user.email) || 
    user.lastName === '.' || 
    user.metadata?.isProfileIncomplete === true ||
    (user.email && user.email.startsWith('student_') && user.email.endsWith('@skd.com')) ||
    (user.email && user.email.startsWith('parent_') && user.email.endsWith('@skd.com'));

  if (isProfileIncomplete) {
    throw new Error('Please complete your profile details before enrolling in any course.');
  }
  
  if (user && (!user.metadata || !user.metadata.rollNo)) {
    const skdCount = await UserModel.countDocuments({ "metadata.rollNo": { $regex: /^SKD/i } });
    const nextSkdRoll = `SKD${skdCount + 1}`;
    user.metadata = { ...user.metadata, rollNo: nextSkdRoll };
    await user.save();
  }
  
  // Find batch
  let assignedBatchId = course.defaultBatchId;
  if (!assignedBatchId) {
    const firstBatch = await BatchModel.findOne({ courseId: id });
    if (firstBatch) {
      assignedBatchId = firstBatch._id;
      // Optionally save it as the default batch for future enrollments
      course.defaultBatchId = firstBatch._id;
      await course.save();
    }
  }

  // Add student to batch
  if (assignedBatchId) {
    await BatchModel.findByIdAndUpdate(assignedBatchId, {
      $addToSet: { students: studentId }
    });
  }
  
  // Create fee record with course and batch tracking
  const feeRecord = new FeeRecord({
    instituteId: course.instituteId,
    studentId: studentId,
    courseId: course._id,
    batchId: assignedBatchId,
    feeType: 'TUITION', // using TUITION as proxy for course fee for now
    amountDue: course.fee || 0,
    amountPaid: course.fee || 0,
    dueDate: new Date(),
    status: 'PAID'
  });
  await feeRecord.save();

  // Create payment transaction
  const paymentTransaction = new PaymentTransaction({
    instituteId: course.instituteId,
    feeRecordId: feeRecord._id,
    studentId: studentId,
    amountPaid: course.fee || 0,
    paymentMethod: payload.paymentMethod || 'UPI',
    transactionId: `TXN_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    status: 'SUCCESS'
  });
  await paymentTransaction.save();

  return { success: true, message: 'Enrolled successfully', transactionId: paymentTransaction.transactionId };
};
