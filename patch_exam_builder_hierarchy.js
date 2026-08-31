const fs = require('fs');
const file = 'src/app/admin/exams/[id]/edit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Filter unpublished subjects
content = content.replace(
  `{hierarchy.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}`,
  `{hierarchy.filter(s => !s.isUnpublished).map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}`
);

// Filter unpublished chapters
content = content.replace(
  `const chapters = Object.values(subjectNode.chapters || {});`,
  `const chapters = Object.values(subjectNode.chapters || {}).filter(c => !c.isUnpublished);`
);

// Filter unpublished topics
content = content.replace(
  `ch.topics.map(t => renderTopicRow(t, selectedSubject, ch._id))`,
  `ch.topics.filter(t => !t.isUnpublished).map(t => renderTopicRow(t, selectedSubject, ch._id))`
);

fs.writeFileSync(file, content);
