const QuestionBank = require('./question-bank.model');
const ExamService = require('./exam.service');
const { QuestionCategory, QuestionChapter, QuestionTopic } = require('./category.model');
const { s3Client, bucketName } = require('../../config/s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

exports.uploadDocx = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { subjectId, bankType } = req.body;
    
    // We only need standard subject fallback if subjectId is not provided
    const fallbackSubjectName = 'General';

    // Call service to parse the buffer (handles images -> S3 and extracts categories)
    const questionsRaw = await ExamService.parseWordTemplate(req.file.buffer);

    // Process categories and create them if they don't exist
    const instituteId = req.user.instituteId;
    const userId = req.user.userId;

    const processedQuestions = [];

    for (const q of questionsRaw) {
      let subject = null;
      let chapter = null;
      let topic = null;
      
      const sName = q.subjectName || fallbackSubjectName;
      const cName = q.chapterName || 'General';
      const tName = q.topicName || 'General';

      if (bankType !== 'FULL_PAPER') {
        // Find or Create Subject
        if (subjectId) {
          subject = await QuestionCategory.findOne({ _id: subjectId, institute: instituteId });
          if (!subject) throw new Error("Provided Subject not found");
        } else {
          subject = await QuestionCategory.findOne({ name: sName, institute: instituteId });
          if (!subject) {
            subject = await QuestionCategory.create({ name: sName, institute: instituteId, createdBy: userId });
          }
        }

        // Find or create Chapter
        chapter = await QuestionChapter.findOne({ name: cName, subject: subject._id });
        if (!chapter) {
          chapter = await QuestionChapter.create({ name: cName, subject: subject._id, createdBy: userId });
        }

        // Find or create Topic
        topic = await QuestionTopic.findOne({ name: tName, chapter: chapter._id, subject: subject._id });
        if (!topic) {
          topic = await QuestionTopic.create({ name: tName, chapter: chapter._id, subject: subject._id, createdBy: userId });
        }
      }

      processedQuestions.push({
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswerText: q.correctAnswerText,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        subject: subject ? subject._id : null,
        chapter: chapter ? chapter._id : null,
        topic: topic ? topic._id : null,
        subjectName: sName,
        chapterName: cName,
        topicName: tName,
        difficulty: q.difficulty || 'Medium',
        explanation: q.explanation || ''
      });
    }

      // Also upload the original docx to S3 so we can preview it with Office Web Viewer
      let docxUrl = '';
      try {
        const fileName = `exams/papers/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.docx`;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }));
        const region = process.env.AWS_REGION || 'ap-south-1';
        docxUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
      } catch (uploadErr) {
        console.error("Failed to upload raw docx for preview", uploadErr);
      }

    res.status(200).json({
      success: true,
      message: 'DOCX parsed and categorized successfully',
      data: processedQuestions,
      docxUrl: docxUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error parsing DOCX: ' + error.message });
  }
};

exports.getHierarchy = async (req, res) => {
  try {
    const pipeline = [
      { $match: { 
          institute: new (require('mongoose').Types.ObjectId)(req.user.instituteId),
          bankType: { $ne: 'FULL_PAPER' }
      } },
      { $unwind: "$questions" },
      { $group: {
          _id: {
            subject: "$questions.subject",
            chapter: "$questions.chapter",
            topic: "$questions.topic",
            difficulty: "$questions.difficulty"
          },
          count: { $sum: 1 }
      }},
      {
        $lookup: { from: "questioncategories", localField: "_id.subject", foreignField: "_id", as: "subjectDoc" }
      },
      {
        $lookup: { from: "questionchapters", localField: "_id.chapter", foreignField: "_id", as: "chapterDoc" }
      },
      {
        $lookup: { from: "questiontopics", localField: "_id.topic", foreignField: "_id", as: "topicDoc" }
      }
    ];

    const results = await QuestionBank.aggregate(pipeline);

    // Transform into a nested tree structure
    const tree = {};

    results.forEach(item => {
      const subject = item.subjectDoc[0];
      const chapter = item.chapterDoc[0];
      const topic = item.topicDoc[0];

      if (!subject || !chapter || !topic) return;

      const sId = subject._id.toString();
      const cId = chapter._id.toString();
      const tId = topic._id.toString();
      const difficulty = item._id.difficulty || 'Medium';

      if (!tree[sId]) {
        tree[sId] = { _id: sId, name: subject.name, count: 0, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, chapters: {} };
      }
      tree[sId].count += item.count;
      if (tree[sId].difficulties[difficulty] !== undefined) tree[sId].difficulties[difficulty] += item.count;

      if (!tree[sId].chapters[cId]) {
        tree[sId].chapters[cId] = { _id: cId, name: chapter.name, count: 0, difficulties: { Easy: 0, Medium: 0, Hard: 0 }, topics: {} };
      }
      tree[sId].chapters[cId].count += item.count;
      if (tree[sId].chapters[cId].difficulties[difficulty] !== undefined) tree[sId].chapters[cId].difficulties[difficulty] += item.count;

      if (!tree[sId].chapters[cId].topics[tId]) {
        tree[sId].chapters[cId].topics[tId] = {
          _id: tId,
          name: topic.name,
          count: 0,
          difficulties: { Easy: 0, Medium: 0, Hard: 0 }
        };
      }
      
      tree[sId].chapters[cId].topics[tId].count += item.count;
      if (tree[sId].chapters[cId].topics[tId].difficulties[difficulty] !== undefined) {
        tree[sId].chapters[cId].topics[tId].difficulties[difficulty] += item.count;
      }
    });

    // Convert object maps back to arrays
    const finalTree = Object.values(tree).map(s => ({
      ...s,
      chapters: Object.values(s.chapters).map(c => ({
        ...c,
        topics: Object.values(c.topics)
      }))
    }));

    res.status(200).json({ success: true, data: finalTree });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestionsByHierarchy = async (req, res) => {
  try {
    const { subject, chapter, topic, random, limit } = req.query;
    
    // Using aggregation to filter within QuestionBank documents
    const matchStage = { institute: new (require('mongoose').Types.ObjectId)(req.user.instituteId) };
    const filterStage = {};
    if (subject) filterStage['questions.subject'] = new (require('mongoose').Types.ObjectId)(subject);
    if (chapter) filterStage['questions.chapter'] = new (require('mongoose').Types.ObjectId)(chapter);
    if (topic) filterStage['questions.topic'] = new (require('mongoose').Types.ObjectId)(topic);

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$questions" }
    ];

    if (Object.keys(filterStage).length > 0) {
      pipeline.push({ $match: filterStage });
    }

    if (random === 'true') {
      pipeline.push({ $sample: { size: parseInt(limit) || 10 } });
    } else if (limit) {
      pipeline.push({ $limit: parseInt(limit) });
    }

    pipeline.push({ $replaceRoot: { newRoot: "$questions" } });

    const questions = await QuestionBank.aggregate(pipeline);
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestionBanks = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { institute: req.user.instituteId };
    if (type) {
      filter.bankType = type;
    }
    
    const questionBanks = await QuestionBank.find(filter)
      .sort('-createdAt')
      .select('-questions'); // Exclude questions for list view to save bandwidth
    
    res.status(200).json({ success: true, data: questionBanks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestionBankById = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findOne({ 
      _id: req.params.id, 
      institute: req.user.instituteId 
    });
    
    if (!questionBank) {
      return res.status(404).json({ success: false, message: 'Question Bank not found' });
    }
    
    res.status(200).json({ success: true, data: questionBank });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createQuestionBank = async (req, res) => {
  try {
    const { title, description, questions, bankType } = req.body;
    
    // Calculate total questions and marks
    const totalQuestions = questions ? questions.length : 0;
    const totalMarks = questions ? questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) : 0;
    
    const qb = new QuestionBank({
      title,
      description,
      bankType: bankType || 'SUBJECT_WISE',
      questions: questions || [],
      totalQuestions,
      totalMarks,
      institute: req.user.instituteId,
      createdBy: req.user.userId
    });
    
    await qb.save();
    res.status(201).json({ success: true, data: qb, message: 'Question Bank created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateQuestionBank = async (req, res) => {
  try {
    const { title, description, questions, bankType } = req.body;
    
    const qb = await QuestionBank.findOne({ _id: req.params.id, institute: req.user.instituteId });
    if (!qb) return res.status(404).json({ success: false, message: 'Question Bank not found' });
    
    if (title) qb.title = title;
    if (description !== undefined) qb.description = description;
    if (bankType !== undefined) qb.bankType = bankType;
    
    if (questions) {
      qb.questions = questions;
      qb.totalQuestions = questions.length;
      qb.totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    }
    
    await qb.save();
    res.status(200).json({ success: true, data: qb, message: 'Question Bank updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteQuestionBank = async (req, res) => {
  try {
    const qb = await QuestionBank.findOneAndDelete({ _id: req.params.id, institute: req.user.instituteId });
    if (!qb) return res.status(404).json({ success: false, message: 'Question Bank not found' });
    
    res.status(200).json({ success: true, message: 'Question Bank deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
