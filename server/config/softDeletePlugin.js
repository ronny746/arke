const mongoose = require('mongoose');

const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }
  });

  const excludeDeleted = function(next) {
    if (this.getFilter && typeof this.getFilter === 'function') {
      const filter = this.getFilter();
      if (filter.isDeleted === undefined) {
        this.where({ isDeleted: { $ne: true } });
      }
    }
    if (typeof next === 'function') next();
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('update', excludeDeleted);
  schema.pre('updateOne', excludeDeleted);
  schema.pre('updateMany', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);

  schema.pre('aggregate', function(next) {
    const pipeline = this.pipeline();
    const hasIsDeleted = pipeline.some(stage => stage.$match && stage.$match.isDeleted !== undefined);
    if (!hasIsDeleted) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
    if (typeof next === 'function') next();
  });
};

// Global overrides to turn deletions into soft deletes
const originalFindByIdAndDelete = mongoose.Model.findByIdAndDelete;
mongoose.Model.findByIdAndDelete = function(id, options) {
  if (options && options.hardDelete) {
    return originalFindByIdAndDelete.call(this, id, options);
  }
  return this.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true, ...options });
};

const originalFindOneAndDelete = mongoose.Model.findOneAndDelete;
mongoose.Model.findOneAndDelete = function(conditions, options) {
  if (options && options.hardDelete) {
    return originalFindOneAndDelete.call(this, conditions, options);
  }
  return this.findOneAndUpdate(conditions, { isDeleted: true, deletedAt: new Date() }, { new: true, ...options });
};

const originalDeleteOne = mongoose.Model.deleteOne;
mongoose.Model.deleteOne = function(conditions, options) {
  if (options && options.hardDelete) {
    return originalDeleteOne.call(this, conditions, options);
  }
  return this.updateOne(conditions, { isDeleted: true, deletedAt: new Date() }, options);
};

const originalDeleteMany = mongoose.Model.deleteMany;
mongoose.Model.deleteMany = function(conditions, options) {
  if (options && options.hardDelete) {
    return originalDeleteMany.call(this, conditions, options);
  }
  return this.updateMany(conditions, { isDeleted: true, deletedAt: new Date() }, options);
};

// Remove alias
const originalFindByIdAndRemove = mongoose.Model.findByIdAndRemove;
if (originalFindByIdAndRemove) {
  mongoose.Model.findByIdAndRemove = function(id, options) {
    if (options && options.hardDelete) {
      return originalFindByIdAndRemove.call(this, id, options);
    }
    return this.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true, ...options });
  };
}

module.exports = softDeletePlugin;
