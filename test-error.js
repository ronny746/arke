const mongoose = require('mongoose');

try {
  new mongoose.Types.ObjectId(undefined);
} catch (e) {
  console.log("Error 1 length:", e.message.length, e.message);
}

try {
  const pipeline = [{ $match: null }];
  pipeline.some(stage => stage.$match && stage.$match.isDeleted !== undefined);
} catch (e) {
  console.log("Error 2 length:", e.message.length, e.message);
}
