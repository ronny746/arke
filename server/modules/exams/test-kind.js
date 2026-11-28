// Chapter test / part test / full mock, read from the title. The app's
// CourseTest.kind uses the same rules, so both show the same label.
const testKind = (title) => {
  const t = String(title || '').toLowerCase();
  if (t.includes('chapter')) return 'CHAPTER';
  if (t.includes('part test') || /\bpt\d/.test(t)) return 'PART';
  if (t.includes('mock') || t.includes('full')) return 'FULL';
  return 'TEST';
};

module.exports = { testKind };
