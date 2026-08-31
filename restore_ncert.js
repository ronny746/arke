const mongoose = require('mongoose');
require('dotenv').config();

const Resource = require('./server/modules/resources/resources.model.js');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const deletedFolder = await Resource.findOne({ 
        title: { $regex: /ncrt|ncert/i }, 
        isActive: false 
      });
      if (deletedFolder) {
        deletedFolder.isActive = true;
        deletedFolder.batchId = null;
        await deletedFolder.save();
        console.log("Restored:", deletedFolder.title);
      } else {
        console.log("Not found any deleted NCERT folder.");
      }
    } catch(err) {
      console.error(err);
    } finally {
      process.exit(0);
    }
  });
