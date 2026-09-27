const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lmsarke?appName=Cluster0').then(async () => {
  const users = await mongoose.connection.db.collection('users').find(
    { role: { $in: ['admin', 'super_admin', 'institute_admin', 'admin_acadops', 'admin_operations'] } },
    { projection: { firstName: 1, lastName: 1, email: 1, phone: 1, role: 1 } }
  ).toArray();
  console.log('\n=== ADMIN USERS ===');
  users.forEach(u => {
    console.log(`Name : ${u.firstName} ${u.lastName}`);
    console.log(`Email: ${u.email}`);
    console.log(`Phone: ${u.phone}`);
    console.log(`Role : ${u.role}`);
    console.log('---');
  });
  mongoose.disconnect();
}).catch(err => console.error(err));
