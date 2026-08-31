const fs = require('fs');
const file = 'server/modules/exams/question-bank.controller.js';
let content = fs.readFileSync(file, 'utf8');

// Modify the item parsing in getHierarchy
const original = `
      if (!subject || !chapter || !topic) return;

      const sId = subject._id.toString();
      const cId = chapter._id.toString();
      const tId = topic._id.toString();
      const difficulty = item._id.difficulty || 'Medium';

      if (!tree[sId]) {
        tree[sId] = { _id: sId, name: subject.name, count: 0, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, chapters: {} };
      }
`;

const replacement = `
      if (!subject || !chapter || !topic) return;

      const sId = subject._id.toString();
      const cId = chapter._id.toString();
      const tId = topic._id.toString();
      const difficulty = item._id.difficulty || 'Medium';

      if (!tree[sId]) {
        tree[sId] = { _id: sId, name: subject.name, count: 0, isUnpublished: subject.isUnpublished || false, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, chapters: {} };
      }
`;
content = content.replace(original, replacement);

const origChapter = `
      if (!tree[sId].chapters[cId]) {
        tree[sId].chapters[cId] = { _id: cId, name: chapter.name, count: 0, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, topics: {} };
      }
`;
const repChapter = `
      if (!tree[sId].chapters[cId]) {
        tree[sId].chapters[cId] = { _id: cId, name: chapter.name, count: 0, isUnpublished: chapter.isUnpublished || false, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, topics: {} };
      }
`;
content = content.replace(origChapter, repChapter);

const origTopic = `
      if (!tree[sId].chapters[cId].topics[tId]) {
        tree[sId].chapters[cId].topics[tId] = {
          _id: tId,
          name: topic.name,
          count: 0,
          difficulties: { Easy: 0, Medium: 0, Hard: 0 }
        };
      }
`;
const repTopic = `
      if (!tree[sId].chapters[cId].topics[tId]) {
        tree[sId].chapters[cId].topics[tId] = {
          _id: tId,
          name: topic.name,
          count: 0,
          isUnpublished: topic.isUnpublished || false,
          difficulties: { Easy: 0, Medium: 0, Hard: 0 }
        };
      }
`;
content = content.replace(origTopic, repTopic);

fs.writeFileSync(file, content);
