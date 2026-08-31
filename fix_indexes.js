const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./server/modules/users/users.model.js');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      // Find old index
      const collection = User.collection;
      const indexes = await collection.indexes();
      const emailIndex = indexes.find(i => i.name === 'email_1');
      
      if (emailIndex) {
        console.log("Dropping old email_1 index...");
        await collection.dropIndex('email_1');
      }
      
      console.log("Creating new sparse email index...");
      await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
      
      console.log("Indexes updated successfully.");
    } catch(err) {
      console.error(err);
    } finally {
      process.exit(0);
    }
  });
