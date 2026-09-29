/**
 * Creates (or refreshes) the safe demo teacher account used for app/web
 * live-class testing. It intentionally only touches its own phone/email and
 * the associated Demo Live Batch data.
 *
 * Run: node server/seed-demo-teacher.js
 */
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./modules/users/users.model');
const Institute = require('./modules/institutes/institutes.model');
const Batch = require('./modules/batches/batches.model');
const Course = require('./modules/courses/courses.model');
const Subject = require('./modules/subjects/subjects.model');
const ClassSchedule = require('./modules/classes-schedule/classes-schedule.model');

const DEMO = {
  phone: '9000000001',
  email: 'demo.teacher@arkescholars.com',
  password: 'Teacher@123',
  batchName: 'Demo Live Batch',
  batchSection: 'A',
  subjectName: 'Interactive Whiteboard',
  courseName: 'Demo Live Classroom Course',
  studentPhone: '9000000002',
  studentEmail: 'demo.student@arkescholars.com',
  studentPassword: 'Student@123',
};

async function findOrCreateInstitute() {
  const existing = await Institute.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (existing) return existing;

  return Institute.create({
    name: 'ARKE Scholars Demo Institute',
    subdomain: 'arke-demo-classroom',
    contactEmail: DEMO.email,
    contactPhone: DEMO.phone,
    isActive: true,
  });
}

async function findOrCreateTeacher(institute) {
  const byPhone = await User.findOne({ phone: DEMO.phone }).select('+password');
  const byEmail = await User.findOne({ email: DEMO.email }).select('+password');

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    throw new Error('Demo phone and email belong to different accounts. Resolve them before seeding.');
  }

  const teacher = byPhone || byEmail || new User({
    phone: DEMO.phone,
    email: DEMO.email,
    password: DEMO.password,
    role: 'teacher',
  });

  teacher.instituteId = institute._id;
  teacher.firstName = 'Demo';
  teacher.lastName = 'Teacher';
  teacher.phone = DEMO.phone;
  teacher.email = DEMO.email;
  teacher.role = 'teacher';
  teacher.isActive = true;
  teacher.metadata = {
    ...(teacher.metadata || {}),
    bio: 'Demo teacher account for live-class and whiteboard testing.',
    targetExam: 'NEET',
    isProfileIncomplete: false,
  };

  // The fixed demo password makes web-portal testing repeatable. Mobile login
  // continues to use the app OTP flow.
  teacher.password = DEMO.password;
  await teacher.save();
  return teacher;
}

async function findOrCreateStudent(institute) {
  const byPhone = await User.findOne({ phone: DEMO.studentPhone }).select('+password');
  const byEmail = await User.findOne({ email: DEMO.studentEmail }).select('+password');

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    throw new Error('Demo student phone and email belong to different accounts. Resolve them before seeding.');
  }

  const student = byPhone || byEmail || new User({
    phone: DEMO.studentPhone,
    email: DEMO.studentEmail,
    password: DEMO.studentPassword,
    role: 'student',
  });

  student.instituteId = institute._id;
  student.firstName = 'Demo';
  student.lastName = 'Student';
  student.phone = DEMO.studentPhone;
  student.email = DEMO.studentEmail;
  student.role = 'student';
  student.isActive = true;
  student.metadata = {
    ...(student.metadata || {}),
    targetExam: 'NEET',
    studentClass: 'Demo Live Batch',
    section: 'A',
    isProfileIncomplete: false,
  };
  student.password = DEMO.studentPassword;
  await student.save();
  return student;
}

async function findOrCreateClassData(institute, teacher, student) {
  let batch = await Batch.findOne({
    instituteId: institute._id,
    name: DEMO.batchName,
    section: DEMO.batchSection,
  });

  if (!batch) {
    batch = new Batch({
      instituteId: institute._id,
      name: DEMO.batchName,
      section: DEMO.batchSection,
      description: 'Safe demo batch for testing the live class and app whiteboard.',
      batchTeacherId: teacher._id,
      teachers: [teacher._id],
      type: 'hybrid',
      isActive: true,
    });
  } else {
    batch.batchTeacherId = teacher._id;
    batch.teachers = Array.from(new Set([...(batch.teachers || []).map(String), String(teacher._id)])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    batch.isActive = true;
  }
  batch.students = Array.from(new Set([...(batch.students || []).map(String), String(student._id)])).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  await batch.save();

  let course = await Course.findOne({
    instituteId: institute._id,
    name: DEMO.courseName,
  });
  if (!course) {
    course = new Course({
      instituteId: institute._id,
      name: DEMO.courseName,
      subtitle: 'Demo course for the live writing-pad classroom.',
      description: 'Safe demo course containing the Demo Live Batch.',
      tag: 'DEMO',
      fee: 0,
      actualFee: 0,
      duration: 'Demo access',
      targetExam: 'NEET',
      targetClass: 'ALL',
      faculties: [teacher._id],
      isPublished: true,
      isActive: true,
    });
  } else {
    course.faculties = Array.from(new Set([...(course.faculties || []).map(String), String(teacher._id)])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    course.isPublished = true;
    course.isActive = true;
  }
  course.defaultBatchId = batch._id;
  await course.save();

  batch.courseId = course._id;
  await batch.save();

  let subject = await Subject.findOne({
    instituteId: institute._id,
    batchId: batch._id,
    name: DEMO.subjectName,
  });
  if (!subject) {
    subject = new Subject({
      instituteId: institute._id,
      batchId: batch._id,
      classId: batch._id,
      name: DEMO.subjectName,
      code: 'DEMO-WB',
      teacherId: teacher._id,
      description: 'Demo subject for app-to-web whiteboard sharing.',
      isActive: true,
    });
  } else {
    subject.teacherId = teacher._id;
    subject.isActive = true;
  }
  await subject.save();

  const dayOfWeek = new Date().getDay();
  let schedule = await ClassSchedule.findOne({
    instituteId: institute._id,
    batchId: batch._id,
    teacherId: teacher._id,
    roomId: 'DEMO-WHITEBOARD',
  });
  if (!schedule) {
    schedule = new ClassSchedule({
      instituteId: institute._id,
      batchId: batch._id,
      subjectId: subject._id,
      teacherId: teacher._id,
      roomId: 'DEMO-WHITEBOARD',
      dayOfWeek,
      startTime: '23:50',
      endTime: '23:59',
      isRecurring: true,
      isActive: true,
    });
  } else {
    schedule.subjectId = subject._id;
    schedule.isActive = true;
  }
  await schedule.save();
  return { batch, course, subject, schedule };
}

async function main() {
  try {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection was not established. Check the server environment configuration.');
    }

    const institute = await findOrCreateInstitute();
    const teacher = await findOrCreateTeacher(institute);
    const student = await findOrCreateStudent(institute);
    const { batch, course, subject, schedule } = await findOrCreateClassData(institute, teacher, student);

    console.log('Demo teacher seed completed.');
    console.log(`Teacher login (web): ${DEMO.email} / ${DEMO.password}`);
    console.log(`Teacher login (app): ${DEMO.phone} / OTP 123456`);
    console.log(`Student login (web): ${DEMO.studentEmail} / ${DEMO.studentPassword}`);
    console.log(`Student login (app): ${DEMO.studentPhone} / OTP 123456`);
    console.log(`Demo course: ${course.name}`);
    console.log(`Demo class: ${batch.name} ${batch.section} — ${subject.name}`);
    console.log(`Class schedule id: ${schedule._id}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`Demo teacher seed failed: ${error.message}`);
  process.exitCode = 1;
});
