const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

// Update validSubjectNames to lowercase
content = content.replace(
  'const validSubjectNames = new Set(validCategories.map(c => c.name));',
  'const validSubjectNames = new Set(validCategories.map(c => c.name ? c.name.toLowerCase() : ""));'
);

// Update .has() check to lowercase
content = content.replace(
  'if (subj !== \'General\' && !validSubjectNames.has(subj)) {',
  'if (subj !== \'General\' && subj && !validSubjectNames.has(subj.toLowerCase())) {'
);

fs.writeFileSync(file, content);
console.log("Patched case insensitive check");
