// Push reminders for part tests and full mocks: the evening before (19:00 IST)
// and the morning of the test (07:00 IST, or 1 hour before an earlier start).
// Runs inside the server every few minutes; each reminder is claimed in the
// database first, so it is sent once even if two servers run it.
const { testKind } = require('./test-kind');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const IST_OFFSET = 5 * HOUR + 30 * MIN;
const CHECK_EVERY_MS = 5 * MIN;

// Midnight IST of the day `ms` falls on, as a UTC timestamp.
const istMidnight = (ms) => Math.floor((ms + IST_OFFSET) / DAY) * DAY - IST_OFFSET;

const reminderSchedule = (startTime) => {
  const start = new Date(startTime).getTime();
  if (!Number.isFinite(start)) return null;
  const dayStart = istMidnight(start);
  return {
    start,
    eveningAt: dayStart - DAY + 19 * HOUR,
    morningAt: Math.min(dayStart + 7 * HOUR, start - HOUR),
  };
};

const isReminderKind = (exam) => ['PART', 'FULL'].includes(testKind(exam?.title));

// Which reminder is due now: 'EVENING', 'MORNING' or null. A late-created test
// gets only the morning one (never both at once).
const dueReminder = (exam, now = Date.now()) => {
  if (!isReminderKind(exam)) return null;
  const s = reminderSchedule(exam?.settings?.startTime);
  if (!s || now >= s.start) return null;
  const sent = String(exam?.reminders?.startTime ? new Date(exam.reminders.startTime).getTime() : '') === String(s.start)
    ? exam.reminders : {};
  if (now >= s.morningAt) return sent.morningSentAt ? null : 'MORNING';
  if (now >= s.eveningAt) return sent.eveningSentAt ? null : 'EVENING';
  return null;
};

const formatIstTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', {
  timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
});

const reminderText = (exam, when) => {
  const start = new Date(exam.settings.startTime).getTime();
  const label = testKind(exam.title) === 'FULL' ? 'Full mock' : 'Part test';
  const at = formatIstTime(start);
  if (when === 'EVENING') {
    return {
      title: `${label} tomorrow: ${exam.title}`,
      message: `Starts tomorrow at ${at}. Kal ${at} baje test hai, aaj jaldi so jaana.`,
    };
  }
  return {
    title: `${label} today: ${exam.title}`,
    message: `Starts today at ${at}. Aaj ${at} baje test hai. All the best!`,
  };
};

// Claim the reminder in the database; true only for the one caller that wins.
const claim = async (Exam, exam, when, now) => {
  const start = new Date(exam.settings.startTime);
  // A moved test starts its reminders afresh.
  await Exam.updateOne(
    { _id: exam._id, 'reminders.startTime': { $ne: start } },
    { $set: { reminders: { startTime: start } } },
  );
  const field = when === 'EVENING' ? 'reminders.eveningSentAt' : 'reminders.morningSentAt';
  const res = await Exam.updateOne(
    { _id: exam._id, 'reminders.startTime': start, [field]: { $exists: false } },
    { $set: { [field]: new Date(now) } },
  );
  return res.modifiedCount === 1;
};

const runOnce = async ({ io, now = Date.now() } = {}) => {
  const Exam = require('./exam.model');
  const Batch = require('../batches/batches.model');
  const NotificationService = require('../notifications/notifications.service');

  const exams = await Exam.find({
    status: 'PUBLISHED',
    'settings.startTime': { $gt: new Date(now), $lt: new Date(now + 2 * DAY) },
  }).select('title institute assignedBatches settings.startTime reminders').lean();

  let sent = 0;
  for (const exam of exams) {
    const when = dueReminder(exam, now);
    if (!when) continue;
    if (!(await claim(Exam, exam, when, now))) continue;
    const batches = await Batch.find({ _id: { $in: exam.assignedBatches || [] } }).select('students').lean();
    const userIds = [...new Set(batches.flatMap((b) => (b.students || []).map(String)))];
    if (!userIds.length) continue;
    const { title, message } = reminderText(exam, when);
    await NotificationService.createForUsers({
      instituteId: exam.institute,
      userIds,
      title,
      message,
      type: 'ALERT', // push data type comes from metadata.type
      metadata: { examId: String(exam._id), when, type: 'EXAM_REMINDER' },
      io,
    });
    sent += userIds.length;
    console.info(`[reminders] ${when} reminder for "${exam.title}" to ${userIds.length} student(s)`);
  }
  return sent;
};

let timer = null;
const start = ({ io } = {}) => {
  if (timer || String(process.env.EXAM_REMINDERS || '').toLowerCase() === 'off') return;
  const tick = () => runOnce({ io }).catch((e) => console.error('[reminders] failed:', e.message));
  timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref?.();
  setTimeout(tick, 30 * 1000).unref?.();
};

module.exports = { reminderSchedule, dueReminder, reminderText, runOnce, start, isReminderKind };
