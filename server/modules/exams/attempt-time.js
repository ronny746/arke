// Time left in an attempt, on the server clock: the earlier of
// (attempt start + duration) and the exam window end. The submit grace period
// is not shown to the student.
const secondsLeftFor = (settings = {}, submission = {}, now = Date.now()) => {
  const limits = [];
  const startedAt = submission?.startTime ? new Date(submission.startTime).getTime() : NaN;
  const durationMs = Number(settings?.durationMinutes) * 60 * 1000;
  if (Number.isFinite(startedAt) && durationMs > 0) limits.push(startedAt + durationMs);
  const windowEnd = settings?.endTime ? new Date(settings.endTime).getTime() : NaN;
  if (Number.isFinite(windowEnd)) limits.push(windowEnd);
  if (!limits.length) return null;
  return Math.max(0, Math.floor((Math.min(...limits) - now) / 1000));
};

module.exports = { secondsLeftFor };
