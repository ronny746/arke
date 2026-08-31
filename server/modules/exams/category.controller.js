const { QuestionCategory } = require('./category.model');

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    let category = await QuestionCategory.findOne({ name, institute: req.user.instituteId });
    if (category) {
      return res.status(400).json({ success: false, message: 'Subject already exists' });
    }

    category = new QuestionCategory({
      name,
      institute: req.user.instituteId,
      createdBy: req.user.userId
    });

    await category.save();
    res.status(201).json({ success: true, data: category, message: 'Subject created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await QuestionCategory.find({ institute: req.user.instituteId })
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
