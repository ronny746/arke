const CourseModel = require('./courses.model');
const { slugifyCourseName, liveCourseQuery } = CourseModel;

const isLearnerRole = (role) => role === 'student' || role === 'parent';

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const BatchModel = require('../batches/batches.model');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');
const InstituteModel = require('../institutes/institutes.model');
const UserModel = require('../users/users.model');
const SubjectModel = require('../subjects/subjects.model');

async function validateLibrarySubjects(payload, instituteId) {
  if (!Array.isArray(payload.subjects) || !payload.subjects.length) return;
  const ids = payload.subjects.map(subject => subject.librarySubjectId).filter(Boolean).map(String);
  if (ids.length !== payload.subjects.length || new Set(ids).size !== ids.length) {
    throw new Error('Select each course subject from the Subject Library exactly once.');
  }
  const count = await SubjectModel.countDocuments({ _id: { $in: ids }, instituteId, isLibrarySubject: true, isActive: true });
  if (count !== ids.length) throw new Error('One or more selected subjects are no longer available in the Subject Library.');
}

async function validateSubjectTeachers(payload, instituteId) {
  if (!Array.isArray(payload.subjects)) return;

  const teacherIds = [...new Set(
    payload.subjects.map(subject => subject.teacherId).filter(Boolean).map(String)
  )];
  if (!teacherIds.length) return;

  const matchingTeachers = await UserModel.countDocuments({
    _id: { $in: teacherIds },
    instituteId,
    role: 'teacher',
    isActive: true
  });

  if (matchingTeachers !== teacherIds.length) {
    throw new Error('Each subject teacher must be an active teacher in this institute.');
  }
}

function includeSubjectTeachersAsFaculty(payload, existingFacultyIds = []) {
  if (!Array.isArray(payload.subjects)) return payload;
  const subjectTeacherIds = payload.subjects.map(subject => subject.teacherId).filter(Boolean).map(String);
  if (subjectTeacherIds.length) {
    payload.faculties = Array.from(new Set([
      ...(payload.faculties || existingFacultyIds).map(String),
      ...subjectTeacherIds
    ]));
  }
  return payload;
}

function duplicateCourseNameError() {
  const error = new Error('A course with this name already exists in this institute. Open the existing course to edit it, or use a different course name.');
  error.statusCode = 409;
  return error;
}

exports.createCourse = async (reqUser, payload) => {
  let instituteId = reqUser.instituteId;
  // A setup admin may not be attached to an institute yet. For a brand-new
  // database safely target the only active institute.
  if (reqUser.role === 'admin' && !instituteId) {
    const institutes = await InstituteModel.find({ isActive: true }).select('_id').limit(2);
    if (institutes.length !== 1) {
      throw new Error('Select an institute before creating a course.');
    }
    instituteId = institutes[0]._id;
  }
  if (!instituteId) throw new Error('An institute is required before creating a course.');
  const existingCourse = await CourseModel.exists({ instituteId, name: payload.name });
  if (existingCourse) throw duplicateCourseNameError();
  await validateSubjectTeachers(payload, instituteId);
  await validateLibrarySubjects(payload, instituteId);
  includeSubjectTeachersAsFaculty(payload);
  const course = new CourseModel({
    ...payload,
    slug: payload.slug || slugifyCourseName(payload.name),
    instituteId
  });
  return await course.save();
};

exports.getCourses = async (reqUser, filters = {}) => {
  const query = {};
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  if (isLearnerRole(reqUser.role)) {
    // Same visibility as the public catalog: active, published, not ended.
    query.$and = [liveCourseQuery()];
  }
  if (filters.targetExam && filters.targetExam !== 'ALL') {
    query.$or = [
      { targetExam: filters.targetExam },
      { targetExam: 'ALL' },
      { targetExam: { $exists: false } },
      { targetExams: filters.targetExam },
      { targetExams: 'ALL' }
    ];
  }
  if (filters.targetClass && filters.targetClass !== 'ALL') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { targetClass: filters.targetClass },
        { targetClass: 'ALL' },
        { targetClass: { $exists: false } },
        { targetClasses: filters.targetClass },
        { targetClasses: 'ALL' }
      ]
    });
  }
  if (filters.medium && filters.medium !== 'ALL') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { medium: filters.medium },
        { medium: 'ALL' },
        { medium: { $exists: false } }
      ]
    });
  }
  return await CourseModel.find(query)
    .populate('faculties', 'firstName lastName email phone profilePictureUrl metadata role')
    .populate('subjects.teacherId', 'firstName lastName profilePictureUrl')
    .populate('subjects.librarySubjectId', 'name icon description topics chaptersCount dppsCount testsCount teacherId')
    .sort({ createdAt: -1 });
};

exports.getCourseById = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser?.instituteId && reqUser.role !== 'student') {
    query.instituteId = reqUser.instituteId;
  }
  if (isLearnerRole(reqUser?.role)) Object.assign(query, liveCourseQuery());
  return await CourseModel.findOne(query)
    .populate('faculties', 'firstName lastName email phone profilePictureUrl metadata role')
    .populate('subjects.teacherId', 'firstName lastName profilePictureUrl')
    .populate('subjects.librarySubjectId', 'name icon description topics chaptersCount dppsCount testsCount teacherId');
};

exports.updateCourse = async (id, payload, reqUser) => {
  const existingCourse = await CourseModel.findOne({ _id: id, instituteId: reqUser.instituteId }).select('faculties');
  if (!existingCourse) return null;
  if (payload.name) {
    const courseWithName = await CourseModel.exists({
      _id: { $ne: id },
      instituteId: reqUser.instituteId,
      name: payload.name
    });
    if (courseWithName) throw duplicateCourseNameError();
  }
  if (payload.name) payload.slug = slugifyCourseName(payload.name);
  await validateSubjectTeachers(payload, reqUser.instituteId);
  await validateLibrarySubjects(payload, reqUser.instituteId);
  includeSubjectTeachersAsFaculty(payload, existingCourse.faculties || []);
  return await CourseModel.findOneAndUpdate(
    { _id: id, instituteId: reqUser.instituteId },
    payload,
    { new: true }
  )
    .populate('faculties', 'firstName lastName email phone profilePictureUrl metadata role')
    .populate('subjects.teacherId', 'firstName lastName profilePictureUrl')
    .populate('subjects.librarySubjectId', 'name icon description topics chaptersCount dppsCount testsCount teacherId');
};

exports.deleteCourse = async (id, reqUser) => {
  return await CourseModel.findOneAndDelete({ _id: id, instituteId: reqUser.instituteId });
};

exports.enrollCourse = async (id, reqUser, payload) => {
  const course = await CourseModel.findById(id);
  if (!course) throw httpError('Course not found', 404);
  
  if (course.endDate && new Date(course.endDate) < new Date()) {
    throw httpError('This course has ended and is no longer accepting enrollments.', 400);
  }

  // Free enrollment only. Paid courses are enrolled by the payment gateway
  // verify path (payments.service fulfillCourseEnrollment).
  if ((Number(course.fee) || 0) > 0) {
    throw httpError('This is a paid course. Please complete payment to enroll.', 400);
  }
  if (course.isActive === false || course.isPublished === false) {
    throw httpError('This course is not open for enrollment.', 400);
  }
  
  const studentId = reqUser.userId || reqUser.id || reqUser._id;
  const user = await UserModel.findById(studentId);
  if (!user) throw new Error('User not found');

  const isProfileIncomplete = 
    !user.firstName || 
    !user.lastName || 
    !user.phone || 
    (user.role !== 'parent' && !user.email) || 
    user.lastName === '.' || 
    user.metadata?.isProfileIncomplete === true ||
    (user.email && user.email.startsWith('student_') && user.email.endsWith('@arke.com')) ||
    (user.email && user.email.startsWith('parent_') && user.email.endsWith('@arke.com'));

  if (isProfileIncomplete) {
    throw new Error('Please complete your profile details before enrolling in any course.');
  }

  // Enrolling twice is a no-op: don't create another fee record / transaction.
  const alreadyEnrolled = await FeeRecord.exists({ studentId, courseId: course._id })
    || await BatchModel.exists({ courseId: course._id, students: studentId });
  if (alreadyEnrolled) {
    return { success: true, message: 'Already enrolled', alreadyEnrolled: true };
  }
  
  if (user && (!user.metadata || !user.metadata.rollNo)) {
    const { generateUniqueRandomRollNo } = require('../../utils/rollNoGenerator');
    const nextRoll = await generateUniqueRandomRollNo(user.instituteId, 'RK');
    user.metadata = { ...user.metadata, rollNo: nextRoll };
    await user.save();
  }
  
  // Find batch
  let assignedBatchId = course.defaultBatchId;
  if (!assignedBatchId) {
    let firstBatch = await BatchModel.findOne({ courseId: id });
    if (!firstBatch) {
      const courseTeachers = (course.faculties || []).filter(Boolean);
      firstBatch = new BatchModel({
        instituteId: course.instituteId || user.instituteId,
        name: `${course.name} Batch 1`,
        section: 'A',
        courseId: course._id,
        teachers: courseTeachers,
        ...(courseTeachers[0] ? { batchTeacherId: courseTeachers[0] } : {}),
        students: [],
        type: 'online',
        isActive: true
      });
      await firstBatch.save();
    }
    assignedBatchId = firstBatch._id;
    course.defaultBatchId = firstBatch._id;
    await course.save();
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

exports.getCourseExams = async (id, reqUser) => {
  const mongoose = require('mongoose');
  if (!id) return [];
  let course;
  if (mongoose.Types.ObjectId.isValid(id)) {
    course = await CourseModel.findById(id);
  } else {
    course = await CourseModel.findOne({ slug: String(id).toLowerCase() });
    if (!course) {
      const candidates = await CourseModel.find({ isActive: true });
      course = candidates.find(item => slugifyCourseName(item.name) === String(id).toLowerCase());
    }
  }
  if (!course) return [];

  const batches = await BatchModel.find({ courseId: course._id }).select('_id');
  const batchIds = batches.map(b => b._id);
  if (course.defaultBatchId && !batchIds.some(bid => bid.toString() === course.defaultBatchId.toString())) {
    batchIds.push(course.defaultBatchId);
  }

  const Exam = require('../exams/exam.model');
  const query = {
    $or: [
      { assignedBatches: { $in: batchIds } },
      { courseId: course._id }
    ]
  };

  // If student or public request, only return published/completed exams
  if (!reqUser || reqUser.role === 'student' || reqUser.role === 'parent') {
    query.status = { $in: ['PUBLISHED', 'COMPLETED'] };
  }

  const exams = await Exam.find(query)
    .populate('assignedBatches', 'name section')
    .sort({ 'settings.startTime': 1, createdAt: -1 });

  // If reqUser is student, attach submission status
  let studentSubmissions = [];
  if (reqUser && (reqUser.role === 'student' || reqUser.userId)) {
    try {
      const ExamSubmission = require('../exams/exam-submission.model');
      const studentId = reqUser.userId || reqUser.id || reqUser._id;
      studentSubmissions = await ExamSubmission.find({ student: studentId, exam: { $in: exams.map(e => e._id) } });
    } catch (e) {
      console.error('Error fetching student submissions:', e);
    }
  }

  return exams.map(exam => {
    const sub = studentSubmissions.find(s => s.exam.toString() === exam._id.toString());
    return {
      ...exam.toObject(),
      submissionStatus: sub ? sub.status : 'NOT_STARTED',
      score: sub ? sub.score : null
    };
  });
};
