const DEFAULT_FLAG_THRESHOLDS = Object.freeze({ redBelow: 40, yellowBelow: 70 });

function normalizeThresholds(input = {}) {
  const redBelow = Number(input.redBelow ?? DEFAULT_FLAG_THRESHOLDS.redBelow);
  const yellowBelow = Number(input.yellowBelow ?? DEFAULT_FLAG_THRESHOLDS.yellowBelow);

  if (!Number.isFinite(redBelow) || !Number.isFinite(yellowBelow) || redBelow < 0 || yellowBelow > 100 || redBelow >= yellowBelow) {
    throw new Error('Flag thresholds must satisfy 0 <= redBelow < yellowBelow <= 100.');
  }

  return { redBelow, yellowBelow };
}

function getTopicFlag(percentage, thresholds) {
  const score = Number(percentage);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('Topic percentage must be a number from 0 to 100.');
  }
  const { redBelow, yellowBelow } = normalizeThresholds(thresholds);
  if (score < redBelow) return 'RED';
  if (score <= yellowBelow) return 'YELLOW';
  return 'GREEN';
}

function normalizeDob(value) {
  if (!value) throw new Error('Date of birth is required for student and parent provisioning.');
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmyMatch = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  const normalized = isoMatch
    ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    : dmyMatch ? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}` : null;
  if (!normalized || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new Error('Date of birth must be a valid YYYY-MM-DD or DD/MM/YYYY date.');
  }
  return normalized;
}

function dobPasswordCandidates(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeDob(raw);
  const [year, month, day] = normalized.split('-');
  return [...new Set([
    raw,
    normalized,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${normalized}T00:00:00.000Z`,
  ])];
}

function makeWelcomeMessage({ courseName, batchName, amountPaid, amountDue, timetableUrl }) {
  const remaining = Math.max(0, Number(amountDue || 0) - Number(amountPaid || 0));
  const timetable = timetableUrl ? ` Your first-week timetable: ${timetableUrl}` : ' Your first-week timetable will appear in the app.';
  return `Welcome to ${courseName}. You are enrolled in ${batchName}. Fee paid: ₹${Number(amountPaid || 0)}. Fee remaining: ₹${remaining}.${timetable}`;
}

module.exports = { DEFAULT_FLAG_THRESHOLDS, normalizeThresholds, getTopicFlag, normalizeDob, dobPasswordCandidates, makeWelcomeMessage };
