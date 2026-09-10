const fs = require('fs');
const file = 'server/modules/practice/practice-session.model.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /_id: String, \/\/ option ID\n      text: String,\n      isCorrect: Boolean,/g,
  "_id: String, // option ID\n      text: String,\n      imageUrl: String,\n      isCorrect: Boolean,"
);

fs.writeFileSync(file, content);
console.log("Patched practice-session.model.js");
