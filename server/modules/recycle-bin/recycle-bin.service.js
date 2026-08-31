const mongoose = require('mongoose');
const { ROLES } = require('../../config/constants');

exports.getDeletedItems = async (reqUser) => {
  const models = mongoose.modelNames();
  let results = [];

  for (const modelName of models) {
    const Model = mongoose.model(modelName);
    
    // Ignore internal or system models if necessary, or just query all
    if (['SecurityAudit', 'SystemConfig'].includes(modelName)) continue;

    const query = { isDeleted: true };
    
    if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN && Model.schema.path('instituteId')) {
      query.instituteId = reqUser.instituteId;
    }

    try {
      // The soft delete plugin allows this query because isDeleted is explicitly specified
      const items = await Model.find(query).sort({ deletedAt: -1 }).limit(100).lean();
      
      if (items.length > 0) {
        const mappedItems = items.map(item => {
          let displayName = item.title || item.name || (item.firstName ? `${item.firstName} ${item.lastName}` : null) || item.email || item._id.toString();
          return {
            _id: item._id,
            displayName,
            deletedAt: item.deletedAt || new Date(), // fallback if manually deleted somehow
            raw: item
          };
        });
        
        results.push({
          collectionName: modelName,
          items: mappedItems
        });
      }
    } catch (e) {
      console.error(`Error fetching recycle bin for model ${modelName}:`, e.message);
    }
  }
  
  return results;
};

exports.restoreItem = async (modelName, id, reqUser) => {
  const Model = mongoose.model(modelName);
  if (!Model) throw new Error('Invalid collection name');
  
  const query = { _id: id, isDeleted: true };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN && Model.schema.path('instituteId')) {
    query.instituteId = reqUser.instituteId;
  }

  const updated = await Model.findOneAndUpdate(query, { $set: { isDeleted: false, deletedAt: null } }, { new: true });
  if (!updated) throw new Error('Item not found or you do not have permission to restore it');
  return updated;
};

exports.permanentlyDeleteItem = async (modelName, id, reqUser) => {
  const Model = mongoose.model(modelName);
  if (!Model) throw new Error('Invalid collection name');
  
  const query = { _id: id, isDeleted: true };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN && Model.schema.path('instituteId')) {
    query.instituteId = reqUser.instituteId;
  }

  const deleted = await Model.findOneAndDelete(query, { hardDelete: true });
  if (!deleted) throw new Error('Item not found or you do not have permission to delete it');
  return deleted;
};
