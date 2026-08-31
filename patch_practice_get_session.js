const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

const oldGetSession = `exports.getSession = async (req, res) => {
  try {
    const session = await PracticeSession.findOne({ 
      _id: req.params.id, 
      student: req.user.userId 
    });`;

const newGetSession = `exports.getSession = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'teacher') {
      query.student = req.user.userId;
    }
    const session = await PracticeSession.findOne(query);`;

content = content.replace(oldGetSession, newGetSession);

fs.writeFileSync(file, content);
