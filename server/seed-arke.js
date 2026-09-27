require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-platform';

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  address: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String }
});

const instituteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, unique: true, sparse: true },
  subdomain: { type: String, unique: true, required: true },
  logoUrl: { type: String },
  planType: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'enterprise' },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String },
  address: { type: String },
  branches: [branchSchema],
  settings: {
    features: {
      liveClasses: { type: Boolean, default: true },
      paymentGateway: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true }
    },
    branding: {
      primaryColor: { type: String, default: '#0B132B' },
      secondaryColor: { type: String, default: '#C99A2E' }
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String },
  role: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Institute = mongoose.models.Institute || mongoose.model('Institute', instituteSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function runSeed() {
  console.log('Connecting to MongoDB at:', MONGO_URI.replace(/:([^:@]+)@/, ':****@'));
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  // 1. Create or Find Institute
  let institute = await Institute.findOne({ subdomain: 'arke' });
  if (!institute) {
    institute = await Institute.create({
      name: 'ARKE Scholars',
      subdomain: 'arke',
      domain: 'arkescholars.com',
      logoUrl: '/arke_logo_light.png',
      planType: 'enterprise',
      contactEmail: 'geniusattechie@gmail.com',
      contactPhone: '+91-9876543210',
      address: 'ARKE Scholars HQ',
      branches: [
        {
          name: 'Main Campus',
          code: 'HQ',
          address: 'ARKE Scholars Headquarters',
          contactEmail: 'geniusattechie@gmail.com',
          contactPhone: '+91-9876543210'
        }
      ],
      settings: {
        features: { liveClasses: true, paymentGateway: true, smsNotifications: true },
        branding: { primaryColor: '#0B132B', secondaryColor: '#C99A2E' }
      },
      isActive: true
    });
    console.log('Institute created: ARKE Scholars (ID:', institute._id.toString(), ')');
  } else {
    console.log('Institute already exists: ARKE Scholars (ID:', institute._id.toString(), ')');
  }

  // 2. Create or Update Superadmin User
  const superAdminEmail = 'geniusattechie@gmail.com';
  let superAdmin = await User.findOne({ email: superAdminEmail });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  if (!superAdmin) {
    superAdmin = await User.create({
      instituteId: institute._id,
      firstName: 'ARKE',
      lastName: 'Superadmin',
      email: superAdminEmail,
      password: hashedPassword,
      phone: '9876543210',
      role: 'super_admin',
      isActive: true
    });
    console.log('Superadmin created:', superAdminEmail);
  } else {
    superAdmin.instituteId = institute._id;
    superAdmin.role = 'super_admin';
    superAdmin.password = hashedPassword;
    superAdmin.isActive = true;
    await superAdmin.save();
    console.log('Superadmin updated to super_admin role & linked to institute:', superAdminEmail);
  }

  console.log('\n=============================================');
  console.log('SUCCESS: Institute & Superadmin ready!');
  console.log('Institute ID   :', institute._id.toString());
  console.log('Superadmin ID  :', superAdmin._id.toString());
  console.log('Superadmin Email:', superAdminEmail);
  console.log('Default Password:', 'Admin@123');
  console.log('Login Portal   : http://localhost:3000/arke-admin');
  console.log('=============================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
