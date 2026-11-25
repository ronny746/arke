// Pure grading helpers shared by submitExam and the analysis endpoints, so the
// score saved at submit and the per-question review never disagree.

const stripHtml = (value) => String(value ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;| /gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// An option with no text and no image is a placeholder ("A", "(B)", "") that
// some imports create for typed-answer questions; it is not a real choice.
const isPlaceholderOption = (option) => {
  if (!option) return true;
  if (option.imageUrl && String(option.imageUrl).trim()) return false;
  const text = stripHtml(option.text);
  return text === '' || /^(?:\(?[A-Da-d1-4]\)?[.)]?|option\s*[A-Da-d1-4])$/i.test(text);
};

const hasRealOptions = (q) => Array.isArray(q?.options) && q.options.some((o) => !isPlaceholderOption(o));

const isTypedAnswerQuestion = (q) => {
  if (['INTEGER', 'NUMERICAL'].includes(q?.type)) return true;
  if (q?.type === 'FILL_BLANKS') return true;
  return !hasRealOptions(q) && Boolean(stripHtml(q?.correctAnswerText));
};

const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// The typed value of an answer, whichever field an app version stored it in.
const typedValue = (ans) => {
  if (!ans) return '';
  if (hasValue(ans.numericAnswer)) return String(ans.numericAnswer).trim();
  if (hasValue(ans.subjectiveAnswerText)) return String(ans.subjectiveAnswerText).trim();
  return '';
};

const answerHasValue = (ans) => Boolean(ans) && (
  hasValue(ans.selectedOptionId) ||
  (Array.isArray(ans.selectedOptionIds) && ans.selectedOptionIds.length > 0) ||
  hasValue(ans.numericAnswer) ||
  hasValue(ans.subjectiveAnswerText)
);

// Concurrent saves can leave two entries for one question. Prefer the last
// entry that actually carries an answer, so an empty duplicate never hides it.
const findStudentAnswer = (answers, questionId) => {
  if (!Array.isArray(answers) || !questionId) return undefined;
  const id = String(questionId);
  const matches = answers.filter((a) => a?.questionId && String(a.questionId) === id);
  if (matches.length === 0) return undefined;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    if (answerHasValue(matches[i])) return matches[i];
  }
  return matches[matches.length - 1];
};

const toNumber = (value) => {
  const s = String(value).replace(/,/g, '').trim();
  if (s === '' || !/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
};

// Accepted answers: "2", "2.00", "<p>2</p>", "Ans: 2", "2 or 3", "2; 3", a range
// "1.5 to 1.6" / "1.5-1.6", or the text of the option marked correct.
const expectedValues = (q) => {
  const raw = stripHtml(q?.correctAnswerText).replace(/^\[?ans(?:wer)?\.?\]?\s*[:\-]?\s*/i, '');
  const values = raw ? raw.split(/\s*(?:\bor\b|;)\s*/i).filter(Boolean) : [];
  if (values.length === 0 && Array.isArray(q?.options)) {
    q.options.filter((o) => o?.isCorrect).forEach((o) => {
      const t = stripHtml(o.text);
      if (t) values.push(t);
    });
  }
  return values;
};

const matchesExpected = (studentVal, expected) => {
  const student = String(studentVal).trim();
  const sNum = toNumber(student);
  const range = expected.match(/^([-+]?\d*\.?\d+)\s*(?:to|–|—|-(?=\s*\d))\s*([-+]?\d*\.?\d+)$/i);
  if (range && !Number.isNaN(sNum)) {
    const lo = Math.min(Number(range[1]), Number(range[2]));
    const hi = Math.max(Number(range[1]), Number(range[2]));
    if (sNum >= lo - 1e-9 && sNum <= hi + 1e-9) return true;
  }
  const eNum = toNumber(expected);
  if (!Number.isNaN(sNum) && !Number.isNaN(eNum)) {
    return Math.abs(sNum - eNum) < 1e-4 * Math.max(1, Math.abs(eNum));
  }
  return student.toLowerCase() === expected.trim().toLowerCase();
};

/**
 * Grades one question. Returns { attempted, isCorrect, marksObtained }.
 * A question only marked for review (no value) is not attempted.
 */
const gradeAnswer = (q, ans) => {
  const qMarks = q?.marks !== undefined && q?.marks !== null ? Number(q.marks) : 4;
  const qNegative = q?.negativeMarks !== undefined && q?.negativeMarks !== null ? Number(q.negativeMarks) : 1;
  const result = (attempted, isCorrect) => ({
    attempted,
    isCorrect,
    marksObtained: !attempted ? 0 : (isCorrect ? qMarks : -qNegative),
  });
  if (!ans) return result(false, false);

  if (isTypedAnswerQuestion(q)) {
    const studentVal = typedValue(ans);
    if (!studentVal) return result(false, false);
    return result(true, expectedValues(q).some((e) => matchesExpected(studentVal, e)));
  }

  const options = Array.isArray(q?.options) ? q.options : [];
  if (q?.type === 'MULTIPLE_CORRECT') {
    const selected = Array.isArray(ans.selectedOptionIds) && ans.selectedOptionIds.length > 0
      ? ans.selectedOptionIds.map(String)
      : (ans.selectedOptionId ? [String(ans.selectedOptionId)] : []);
    if (selected.length === 0) return result(false, false);
    const correct = options.filter((o) => o.isCorrect).map((o) => String(o._id));
    return result(true, correct.length === selected.length && correct.every((id) => selected.includes(id)));
  }

  if (!ans.selectedOptionId) return result(false, false);
  const correctOpt = options.find((o) => o.isCorrect);
  return result(true, Boolean(correctOpt) && String(correctOpt._id) === String(ans.selectedOptionId));
};

module.exports = {
  stripHtml,
  isPlaceholderOption,
  hasRealOptions,
  isTypedAnswerQuestion,
  typedValue,
  answerHasValue,
  findStudentAnswer,
  expectedValues,
  matchesExpected,
  gradeAnswer,
};
