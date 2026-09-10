const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the options mapping to avoid Mongoose CastError on subdocuments
content = content.replace(
  /options: question\.options,/,
  `options: (question.options || []).map(o => ({ _id: o._id ? o._id.toString() : (o.id ? o.id.toString() : undefined), text: o.text, imageUrl: o.imageUrl, isCorrect: o.isCorrect })),`
);

// 2. Fix the "General" matching bug
const oldMatch = `      if (subject) qMatch["questions.subjectName"] = subject;
      if (chapter) qMatch["questions.chapterName"] = chapter;
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        qMatch["questions.topicName"] = { $in: topics };
      } else if (topic) {
        qMatch["questions.topicName"] = topic;
      }`;
      
const newMatch = `      if (subject) {
        if (subject === 'General') {
           qMatch["questions.subjectName"] = { $in: [null, '', 'General'] };
        } else {
           qMatch["questions.subjectName"] = subject;
        }
      }
      if (chapter) {
        if (chapter === 'General') {
           qMatch["questions.chapterName"] = { $in: [null, '', 'General'] };
        } else {
           qMatch["questions.chapterName"] = chapter;
        }
      }
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        qMatch["questions.topicName"] = { $in: topics };
      } else if (topic) {
        if (topic === 'General') {
           qMatch["questions.topicName"] = { $in: [null, '', 'General'] };
        } else {
           qMatch["questions.topicName"] = topic;
        }
      }`;
      
content = content.replace(oldMatch, newMatch);

fs.writeFileSync(file, content);
console.log("Patched practice.controller.js");
