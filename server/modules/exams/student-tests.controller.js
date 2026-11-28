// Student Home helpers: free tests (no course/batch needed), the "Next test"
// card, and the open attempt to continue after an app crash.
const Exam = require('./exam.model');
const ExamSubmission = require('./exam-submission.model');
const { testKind } = require('./test-kind');
const { pickNextTest } = require('./next-test');
const { secondsLeftFor } = require('./attempt-time');

const LIST_FIELDS = 'title settings.startTime settings.endTime settings.durationMinutes settings.showResultsAfterSubmit totalMarks totalQuestions accessMode accessPrice status examType assignedBatches';

const studentBatches = async (userId) => {
  const Batch = require('../batches/batches.model');
  return Batch.find({ students: userId }).select('_id courseId').populate('courseId', 'name').lean();
};

// Course name of an exam, from the first assigned batch that belongs to a course.
const courseNamesFor = async (exams) => {
  const Batch = require('../batches/batches.model');
  const ids = [...new Set(exams.flatMap((e) => (e.assignedBatches || []).map(String)))];
  if (!ids.length) return new Map();
  const batches = await Batch.find({ _id: { $in: ids } }).select('_id courseId').populate('courseId', 'name').lean();
  const byBatch = new Map(batches.map((b) => [String(b._id), b.courseId?.name || null]));
  return new Map(exams.map((e) => [
    String(e._id),
    (e.assignedBatches || []).map((b) => byBatch.get(String(b))).find(Boolean) || null,
  ]));
};

const statusMap = async (studentId, examIds) => {
  if (!examIds.length) return { status: new Map(), score: new Map() };
  const subs = await ExamSubmission.find({ student: studentId, exam: { $in: examIds } }).select('exam status score').lean();
  return {
    status: new Map(subs.map((s) => [String(s.exam), s.status])),
    score: new Map(subs.map((s) => [String(s.exam), s.score])),
  };
};

const toListItem = (exam, maps, courseNames) => {
  const { assignedBatches, ...rest } = exam;
  const id = String(exam._id);
  return {
    ...rest,
    kind: testKind(exam.title),
    courseName: courseNames.get(id) || null,
    submissionStatus: maps.status.get(id) || 'NOT_STARTED',
    score: maps.score.has(id) ? maps.score.get(id) : null,
  };
};

// GET /exams/student/free-tests
exports.getFreeTests = async (req, res) => {
  try {
    const exams = await Exam.find({ institute: req.user.instituteId, status: 'PUBLISHED', accessMode: 'FREE' })
      .select(LIST_FIELDS).sort({ 'settings.startTime': 1, createdAt: 1 }).lean();
    const ids = exams.map((e) => e._id);
    const [maps, courseNames] = await Promise.all([statusMap(req.user.userId, ids), courseNamesFor(exams)]);
    res.status(200).json({ success: true, data: exams.map((e) => toListItem(e, maps, courseNames)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /exams/student/next-test
exports.getNextTest = async (req, res) => {
  try {
    const batches = await studentBatches(req.user.userId);
    const batchIds = batches.map((b) => b._id);
    const now = Date.now();
    const exams = await Exam.find({
      institute: req.user.instituteId,
      status: 'PUBLISHED',
      'settings.endTime': { $gt: new Date(now) },
      $or: [{ assignedBatches: { $in: batchIds } }, { accessMode: 'FREE' }],
    }).select(LIST_FIELDS).lean();

    const maps = await statusMap(req.user.userId, exams.map((e) => e._id));
    const picked = pickNextTest(exams, maps.status, now);
    if (!picked) return res.status(200).json({ success: true, data: null });

    const courseNames = await courseNamesFor([picked.exam]);
    const item = toListItem(picked.exam, maps, courseNames);
    const startsAt = picked.exam.settings?.startTime || null;
    const endsAt = picked.exam.settings?.endTime || null;
    res.status(200).json({
      success: true,
      data: {
        exam: item,
        startsAt,
        endsAt,
        canStart: !startsAt || new Date(startsAt).getTime() <= now,
        isInProgress: picked.reason === 'IN_PROGRESS',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /exams/student/in-progress
exports.getInProgressAttempt = async (req, res) => {
  try {
    const subs = await ExamSubmission.find({ student: req.user.userId, status: 'IN_PROGRESS' })
      .select('exam startTime').sort({ startTime: -1 }).limit(5).lean();
    if (!subs.length) return res.status(200).json({ success: true, data: null });
    const exams = await Exam.find({ _id: { $in: subs.map((s) => s.exam) }, status: 'PUBLISHED' })
      .select('title settings').lean();
    const byId = new Map(exams.map((e) => [String(e._id), e]));
    const now = Date.now();
    for (const sub of subs) {
      const exam = byId.get(String(sub.exam));
      if (!exam) continue;
      const secondsLeft = secondsLeftFor(exam.settings, sub, now);
      if (secondsLeft > 0) {
        return res.status(200).json({
          success: true,
          data: { examId: String(exam._id), title: exam.title, secondsLeft, startedAt: sub.startTime },
        });
      }
    }
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
