const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['BOOK', 'UNIFORM', 'LAPTOP', 'OTHER'], required: true },
  stockCount: { type: Number, default: 0 },
  price: { type: Number, default: 0 }
}, { timestamps: true });

const inventoryIssueSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  returnDate: { type: Date },
  status: { type: String, enum: ['ISSUED', 'RETURNED', 'LOST'], default: 'ISSUED' }
}, { timestamps: true });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
const InventoryIssue = mongoose.model('InventoryIssue', inventoryIssueSchema);

module.exports = { InventoryItem, InventoryIssue };
