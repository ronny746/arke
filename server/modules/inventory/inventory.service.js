const { InventoryItem, InventoryIssue } = require('./inventory.model');

exports.addItem = async (reqUser, payload) => {
  const item = new InventoryItem({
    ...payload,
    instituteId: reqUser.instituteId
  });
  return await item.save();
};

exports.getItems = async (reqUser) => {
  return await InventoryItem.find({ instituteId: reqUser.instituteId });
};

exports.issueItem = async (reqUser, payload) => {
  const { itemId, studentId, dueDate } = payload;
  
  const item = await InventoryItem.findOne({ _id: itemId, instituteId: reqUser.instituteId });
  if (!item) throw new Error('Item not found');
  if (item.stockCount <= 0) throw new Error('Item out of stock');

  const issue = new InventoryIssue({
    instituteId: reqUser.instituteId,
    itemId,
    studentId,
    dueDate
  });

  await issue.save();
  
  // Decrement stock
  item.stockCount -= 1;
  await item.save();

  return issue;
};

exports.returnItem = async (issueId, reqUser) => {
  const issue = await InventoryIssue.findOne({ _id: issueId, instituteId: reqUser.instituteId, status: 'ISSUED' });
  if (!issue) throw new Error('Issue record not found or already returned');

  issue.status = 'RETURNED';
  issue.returnDate = new Date();
  await issue.save();

  // Increment stock
  await InventoryItem.findByIdAndUpdate(issue.itemId, { $inc: { stockCount: 1 } });

  return issue;
};
