// Check a paper right after upload, so the admin sees problems at once
// instead of checking through the API: MCQs need exactly 4 options and 1
// answer, integer answers must be whole numbers, and so on.

// Single-answer types that show 4 options like an MCQ.
const SINGLE_CORRECT = new Set(['MCQ', 'ASSERTION_REASON', 'MATCH_THE_COLUMN', 'STATEMENT_BASED']);

const stripHtml = (html) => String(html || '')
  .replace(/<img\b[^>]*>/gi, ' [image] ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const snippetOf = (q) => {
  const text = stripHtml(q?.questionText);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const hasContent = (opt) => Boolean(stripHtml(opt?.text) || String(opt?.imageUrl || '').trim());

const problemsOf = (q) => {
  const type = String(q?.type || 'MCQ').toUpperCase();
  const options = Array.isArray(q?.options) ? q.options : [];
  const correct = options.filter((o) => o?.isCorrect === true).length;
  const answer = String(q?.correctAnswerText ?? '').trim();
  const problems = [];

  if (!stripHtml(q?.questionText) && !String(q?.questionImageUrl || '').trim()) {
    problems.push('Question text is empty');
  }

  if (SINGLE_CORRECT.has(type) || type === 'MULTIPLE_CORRECT') {
    if (options.length !== 4) problems.push(`Has ${options.length} option(s), needs exactly 4`);
    const empty = options.filter((o) => !hasContent(o)).length;
    if (empty) problems.push(`${empty} option(s) are empty`);
    if (SINGLE_CORRECT.has(type) && correct !== 1) {
      problems.push(correct === 0 ? 'No correct answer marked' : `${correct} answers marked, needs exactly 1`);
    }
    if (type === 'MULTIPLE_CORRECT' && correct === 0) problems.push('No correct answer marked');
  } else if (type === 'INTEGER') {
    if (!answer) problems.push('Integer answer is missing');
    else if (!/^[+-]?\d+$/.test(answer)) problems.push(`Integer answer "${answer}" is not a whole number`);
  } else if (type === 'NUMERICAL') {
    if (!answer) problems.push('Numerical answer is missing');
    else if (!Number.isFinite(Number(answer))) problems.push(`Numerical answer "${answer}" is not a number`);
  } else if (type === 'TRUE_FALSE') {
    if (correct !== 1 && !/^(true|false)$/i.test(answer)) problems.push('True/False answer is missing');
  }

  const marks = q?.marks === undefined || q?.marks === null ? 4 : Number(q.marks);
  if (!Number.isFinite(marks) || marks <= 0) problems.push('Marks must be more than 0');

  return problems;
};

/**
 * @param {Array} questions  exam questions in paper order
 * @returns {{ total, totalMarks, byType, issueCount, issues: Array<{ number, questionId, type, problems, snippet }>, ok }}
 */
const checkQuestions = (questions) => {
  const list = Array.isArray(questions) ? questions : [];
  const byType = {};
  let totalMarks = 0;
  const issues = [];

  list.forEach((q, i) => {
    const type = String(q?.type || 'MCQ').toUpperCase();
    byType[type] = (byType[type] || 0) + 1;
    const marks = q?.marks === undefined || q?.marks === null ? 4 : Number(q.marks);
    if (Number.isFinite(marks)) totalMarks += marks;
    const problems = problemsOf(q);
    if (problems.length) {
      issues.push({
        number: i + 1,
        questionId: q?._id ? String(q._id) : null,
        type,
        problems,
        snippet: snippetOf(q),
      });
    }
  });

  return { total: list.length, totalMarks, byType, issueCount: issues.length, issues, ok: issues.length === 0 };
};

module.exports = { checkQuestions };
