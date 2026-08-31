const fs = require('fs');
const file = 'src/api/student.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `submitPracticeSession: (sessionId) => axiosInstance.post(\`/practice/\${sessionId}/submit\`),`,
  `submitPracticeSession: (sessionId, payload) => axiosInstance.post(\`/practice/\${sessionId}/submit\`, payload),`
);

fs.writeFileSync(file, content);
