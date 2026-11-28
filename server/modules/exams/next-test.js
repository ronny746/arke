// Which test the Home "Next test" card shows. Pure, so it can be tested.
const { testKind } = require('./test-kind');

const DAY_MS = 24 * 60 * 60 * 1000;
// A window up to this long is a scheduled sitting (e.g. a Sunday mock). Tests
// that stay open for weeks are practice tests, not "the next test".
const SCHEDULED_WINDOW_MS = 3 * DAY_MS;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const time = (d) => (d ? new Date(d).getTime() : NaN);
const istDay = (ms) => Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
const isMajor = (exam) => ['PART', 'FULL'].includes(testKind(exam?.title));

/**
 * @param {Array} exams  candidate exams (published, accessible to the student)
 * @param {Map<string,string>} statusByExam  exam id -> submission status
 * @param {number} now  ms
 * @returns {{ exam, reason: 'IN_PROGRESS'|'LIVE'|'UPCOMING' } | null}
 */
const pickNextTest = (exams, statusByExam, now = Date.now()) => {
  const list = (Array.isArray(exams) ? exams : []).filter((e) => {
    const status = statusByExam?.get?.(String(e._id));
    return status !== 'SUBMITTED' && status !== 'AUTO_SUBMITTED' && status !== 'REJECTED';
  });
  const open = list.filter((e) => !(time(e.settings?.endTime) <= now));

  const inProgress = open.filter((e) => statusByExam?.get?.(String(e._id)) === 'IN_PROGRESS')
    .sort((a, b) => time(a.settings?.endTime) - time(b.settings?.endTime));
  if (inProgress.length) return { exam: inProgress[0], reason: 'IN_PROGRESS' };

  const live = open.filter((e) => {
    const start = time(e.settings?.startTime);
    const end = time(e.settings?.endTime);
    return start <= now && Number.isFinite(end) && end - start <= SCHEDULED_WINDOW_MS;
  }).sort((a, b) => (isMajor(b) - isMajor(a)) || (time(a.settings?.endTime) - time(b.settings?.endTime)));
  if (live.length) return { exam: live[0], reason: 'LIVE' };

  const upcoming = open.filter((e) => time(e.settings?.startTime) > now)
    .sort((a, b) => {
      const sa = time(a.settings.startTime);
      const sb = time(b.settings.startTime);
      if (istDay(sa) !== istDay(sb)) return sa - sb;
      return (isMajor(b) - isMajor(a)) || (sa - sb);
    });
  if (upcoming.length) return { exam: upcoming[0], reason: 'UPCOMING' };
  return null;
};

module.exports = { pickNextTest, SCHEDULED_WINDOW_MS };
