const fs = require('fs');
const file = 'server/modules/practice/practice-session.model.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  completedAt: Date`,
  `  completedAt: Date,
  totalTimeSpentSeconds: {
    type: Number,
    default: 0
  }`
);

fs.writeFileSync(file, content);
