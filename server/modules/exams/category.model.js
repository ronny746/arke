const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isUnpublished: { type: Boolean, default: false }
}, { timestamps: true });

const chapterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionCategory',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isUnpublished: { type: Boolean, default: false }
}, { timestamps: true });

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionChapter',
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionCategory',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isUnpublished: { type: Boolean, default: false }
}, { timestamps: true });

const QuestionCategory = mongoose.models.QuestionCategory || mongoose.model('QuestionCategory', subjectSchema);
const QuestionChapter = mongoose.models.QuestionChapter || mongoose.model('QuestionChapter', chapterSchema);
const QuestionTopic = mongoose.models.QuestionTopic || mongoose.model('QuestionTopic', topicSchema);

module.exports = { QuestionCategory, QuestionChapter, QuestionTopic };
