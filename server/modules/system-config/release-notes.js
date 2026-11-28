// App release notes: one entry per version, newest version first. Empty
// lines are dropped and a version listed twice keeps its first entry.
const versionParts = (v) => String(v || '').replace(/^v/i, '').split(/[.+-]/).map((p) => Number.parseInt(p, 10) || 0);

const compareVersionsDesc = (a, b) => {
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] || 0) - (pa[i] || 0);
    if (d) return d;
  }
  return 0;
};

const normalizeReleaseNotes = (entries) => {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : [])
    .map((e) => {
      const raw = typeof e?.toObject === 'function' ? e.toObject() : e;
      const date = raw?.date ? new Date(raw.date) : null;
      return {
        version: String(raw?.version || '').trim(),
        date: date && !Number.isNaN(date.getTime()) ? date : null,
        notes: (Array.isArray(raw?.notes) ? raw.notes : []).map((n) => String(n || '').trim()).filter(Boolean),
      };
    })
    .filter((e) => e.version && e.notes.length && !seen.has(e.version) && seen.add(e.version))
    .sort((a, b) => compareVersionsDesc(a.version, b.version));
};

module.exports = { normalizeReleaseNotes, compareVersionsDesc };
