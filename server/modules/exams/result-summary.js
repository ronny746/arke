// "Result in one screen": the headline numbers and the 3 weakest chapters,
// shown first after a test, before the detailed review.

const idOf = (v) => (v && typeof v === 'object' ? (v._id ?? v.id) : v);

const nameOf = (v) => (v && typeof v === 'object' && typeof v.name === 'string' ? v.name : '');

// Chapter of a graded question: its saved chapterName, else the name of its
// chapter id, else its topic, else 'General'.
const chapterOf = (q, chapterNames) => {
  const fromMap = chapterNames?.get?.(String(idOf(q?.chapter) ?? '')) || '';
  return (q?.chapterName || nameOf(q?.chapter) || fromMap || nameOf(q?.topic) || q?.topicName || 'General').trim();
};

const subjectOf = (q) => (nameOf(q?.subject) || q?.subjectName || 'General').trim();

/**
 * @param {Array} detailedQuestions  graded questions (attempted, isCorrect, marksObtained, marks)
 * @param {Map<string,string>} [chapterNames]  chapter id -> name
 * @param {number} [limit]
 */
const weakestChapters = (detailedQuestions, chapterNames, limit = 3) => {
  const groups = new Map();
  (Array.isArray(detailedQuestions) ? detailedQuestions : []).forEach((q) => {
    const subject = subjectOf(q);
    const chapter = chapterOf(q, chapterNames);
    const key = `${subject}::${chapter}`;
    const g = groups.get(key) || {
      subject, chapter, score: 0, totalMarks: 0, totalQuestions: 0, correct: 0, wrong: 0, unattempted: 0,
    };
    const marks = q?.marks === undefined || q?.marks === null ? 4 : Number(q.marks) || 0;
    g.totalQuestions++;
    g.totalMarks += marks;
    g.score += Number(q?.marksObtained) || 0;
    if (!q?.attempted) g.unattempted++;
    else if (q?.isCorrect) g.correct++;
    else g.wrong++;
    groups.set(key, g);
  });

  return [...groups.values()]
    .filter((g) => g.correct < g.totalQuestions) // nothing to improve if all correct
    .map((g) => ({
      ...g,
      accuracy: g.totalQuestions ? Math.round((g.correct / g.totalQuestions) * 100) : 0,
      scorePercent: g.totalMarks ? g.score / g.totalMarks : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy
      || a.scorePercent - b.scorePercent
      || b.totalQuestions - a.totalQuestions
      || a.chapter.localeCompare(b.chapter))
    .slice(0, limit)
    .map(({ scorePercent, ...g }) => g);
};

const resultSummary = ({ detailedQuestions, score, totalMarks, timeUsedSeconds, durationMinutes, expectedJeePercentile }) => {
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  (Array.isArray(detailedQuestions) ? detailedQuestions : []).forEach((q) => {
    if (!q?.attempted) unattempted++;
    else if (q?.isCorrect) correct++;
    else wrong++;
  });
  const attempted = correct + wrong;
  return {
    score,
    totalMarks,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    correct,
    wrong,
    unattempted,
    timeUsedSeconds: Math.max(0, Math.round(Number(timeUsedSeconds) || 0)),
    durationMinutes: Number(durationMinutes) || null,
    expectedJeePercentile: typeof expectedJeePercentile === 'number' ? expectedJeePercentile : null,
  };
};

// Chapter ids used by the questions that have no chapterName saved.
const missingChapterIds = (questions) => [...new Set(
  (Array.isArray(questions) ? questions : [])
    .filter((q) => !q?.chapterName && idOf(q?.chapter))
    .map((q) => String(idOf(q.chapter))),
)];

module.exports = { weakestChapters, resultSummary, missingChapterIds };
