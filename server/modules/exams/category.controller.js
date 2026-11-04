const { QuestionClass, QuestionCategory, QuestionChapter, QuestionTopic } = require('./category.model');

exports.getClasses = async (req, res) => {
  try {
    const classes = await QuestionClass.find({ institute: req.user.instituteId }).sort('name');
    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Class name is required' });

    let qClass = await QuestionClass.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      institute: req.user.instituteId 
    });
    if (qClass) {
      return res.status(400).json({ success: false, message: 'Class already exists' });
    }

    qClass = new QuestionClass({
      name: name.trim(),
      institute: req.user.instituteId,
      createdBy: req.user.userId
    });

    await qClass.save();
    res.status(201).json({ success: true, data: qClass, message: 'Class created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renameClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Class name is required' });

    const qClass = await QuestionClass.findOneAndUpdate(
      { _id: id, institute: req.user.instituteId },
      { name: name.trim() },
      { new: true }
    );
    if (!qClass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Also update className in QuestionCategory and QuestionBank questions
    await QuestionCategory.updateMany(
      { class: id, institute: req.user.instituteId },
      { className: name.trim() }
    );
    try {
      const QuestionBank = require('./question-bank.model');
      await QuestionBank.updateMany(
        { institute: req.user.instituteId, 'questions.class': id },
        { $set: { 'questions.$[elem].className': name.trim() } },
        { arrayFilters: [{ 'elem.class': id }] }
      );
    } catch (e) {
      console.error('Failed to update question bank question classes:', e);
    }

    res.status(200).json({ success: true, data: qClass, message: 'Class renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const qClass = await QuestionClass.findOneAndDelete({ _id: req.params.id, institute: req.user.instituteId });
    if (!qClass) return res.status(404).json({ success: false, message: 'Class not found' });

    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, classId, className } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const filter = { name: name.trim(), institute: req.user.instituteId };
    if (classId) {
      filter.class = classId;
    }

    let category = await QuestionCategory.findOne(filter);
    if (category) {
      return res.status(400).json({ success: false, message: 'Subject already exists' });
    }

    let resolvedClassName = className;
    if (classId && !resolvedClassName) {
      const cls = await QuestionClass.findById(classId);
      if (cls) resolvedClassName = cls.name;
    }

    category = new QuestionCategory({
      name: name.trim(),
      class: classId || undefined,
      className: resolvedClassName || undefined,
      institute: req.user.instituteId,
      createdBy: req.user.userId
    });

    await category.save();
    res.status(201).json({ success: true, data: category, message: 'Subject created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renameCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const category = await QuestionCategory.findOneAndUpdate(
      { _id: id, institute: req.user.instituteId },
      { name },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Subject not found' });

    res.status(200).json({ success: true, data: category, message: 'Subject renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const filter = { institute: req.user.instituteId };
    if (req.query.classId) {
      filter.class = req.query.classId;
    }
    const categories = await QuestionCategory.find(filter)
      .populate('class', 'name')
      .sort('name');
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await QuestionCategory.findOneAndDelete({ _id: req.params.id, institute: req.user.instituteId });
    if (!category) return res.status(404).json({ success: false, message: 'Subject not found' });
    
    // NOTE: This leaves dangling Chapters, Topics and Questions. 
    // In a full implementation, you should cascade delete these or prompt the user.
    // We will leave this simple for now.

    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteChapter = async (req, res) => {
  try {
    const chapter = await QuestionChapter.findOneAndDelete({ _id: req.params.id });
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });
    res.status(200).json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await QuestionTopic.findOneAndDelete({ _id: req.params.id });
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });
    res.status(200).json({ success: true, message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renameChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const chapter = await QuestionChapter.findOneAndUpdate(
      { _id: id },
      { name },
      { new: true }
    );
    if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found' });

    res.status(200).json({ success: true, data: chapter, message: 'Chapter renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renameTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const topic = await QuestionTopic.findOneAndUpdate(
      { _id: id },
      { name },
      { new: true }
    );
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

    res.status(200).json({ success: true, data: topic, message: 'Topic renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.togglePublish = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isUnpublished } = req.body;
    let doc;
    if (type === 'class') doc = await QuestionClass.findById(id);
    else if (type === 'subject') doc = await QuestionCategory.findById(id);
    else if (type === 'chapter') doc = await QuestionChapter.findById(id);
    else if (type === 'topic') doc = await QuestionTopic.findById(id);
    
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    
    doc.isUnpublished = isUnpublished;
    await doc.save();
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
