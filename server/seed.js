/**
 * Seed Script — SKD Institute + Admin User + 3 Batches
 * Run: node server/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI;

// ── Schemas (inline to avoid circular imports) ─────────────────────────────
const instituteSchema = new mongoose.Schema({
  name: String, domain: String, subdomain: { type: String, unique: true },
  logoUrl: String, planType: { type: String, default: 'premium' },
  contactEmail: String, contactPhone: String, address: String,
  branches: [], settings: mongoose.Schema.Types.Mixed, isActive: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  instituteId: mongoose.Schema.Types.ObjectId,
  firstName: String, lastName: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },
  phone: String, role: String, isActive: { type: Boolean, default: true }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  tag: { type: String },
  description: { type: String },
  fee: { type: Number },
  duration: { type: String },
  subtitle: { type: String },
  features: [{ type: String }],
  bestFor: [{ type: String }],
  color: { type: String },
  badge: { type: String },
  popular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
courseSchema.index({ instituteId: 1, name: 1 }, { unique: true });

const batchSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId },
  name: String, section: String, type: { type: String, default: 'offline' },
  students: [], batchTeacherId: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
batchSchema.index({ instituteId: 1, name: 1, section: 1 }, { unique: true });

const Institute = mongoose.models.Institute || mongoose.model('Institute', instituteSchema);
const User      = mongoose.models.User      || mongoose.model('User', userSchema);
const Course    = mongoose.models.Course    || mongoose.model('Course', courseSchema);
const Batch     = mongoose.models.Batch     || mongoose.model('Batch', batchSchema);

const COURSES = [
  {
    name: 'SKD Prime',
    subtitle: 'Complete NEET Preparation Program',
    price: 9999, // we map price to fee
    fee: 9999,
    tag: 'NEET 2027',
    description: 'The ultimate online course for NEET aspirants. Daily live classes, comprehensive test series, and dedicated doubt support.',
    duration: '12 Months',
    color: '#0033a0',
    popular: true,
    badge: 'BEST VALUE',
    features: [
      'Daily LIVE Interactive Classes',
      'High Quality Class Notes (PDF)',
      'Complete NEET PYQ Practice Sheets',
      'Full Access to NEET Yoddha Test Series (CBT)',
      'Subject-wise Daily Practice Papers (DPPs)',
      '24×7 One-to-One Doubt Support',
      'NCERT Books (PDF)',
      'Complete Video Solutions of Test Series',
      'FREE Offline Grand Test after Syllabus Completion'
    ],
    bestFor: ['First-time aspirants', 'Class XI & XII students', 'Droppers', 'Full guidance seekers'],
    batches: [
      { name: 'Morning Prime', section: 'M1', type: 'hybrid' },
      { name: 'Evening Prime', section: 'E1', type: 'online' }
    ]
  },
  {
    name: 'NEET Yodha Test Series',
    subtitle: 'Practice Like the Real NEET Exam',
    fee: 6999,
    tag: 'NEET 2027',
    description: 'Comprehensive test series for NEET aspirants who want to polish their preparation and track their rank.',
    duration: '8 Months',
    color: '#e8470a',
    popular: false,
    badge: '',
    features: [
      'Computer-Based Tests (CBT)',
      'NEET Pattern Tests',
      'Minor & Major, Chapter-wise Tests',
      'Full Syllabus Tests',
      'Grand Mock Tests',
      'Detailed Performance Analysis',
      'Rank Prediction',
      'Video Solutions'
    ],
    bestFor: ['Coaching students', 'School students', 'Self-study aspirants', 'Revision phase'],
    batches: [
      { name: 'Test Batch', section: 'T1', type: 'online' }
    ]
  },
  {
    name: 'SKD NEO',
    subtitle: 'Learn with Expert Faculty',
    fee: 4999,
    tag: 'NEET 2027',
    description: 'Focused learning program with live classes, study material, and doubt clearing sessions.',
    duration: '6 Months',
    color: '#7b3fa0',
    popular: false,
    badge: '',
    features: [
      'Daily LIVE Classes',
      'Concept Building from Basics',
      'Class Notes PDF',
      'Complete NEET PYQ Practice Sheets',
      'Subject-wise DPPs',
      '24×7 One-to-One Doubt Support',
      'NCERT PDF Notes'
    ],
    bestFor: ['Conceptual learners', 'Freshers', 'Repeaters wanting clarity'],
    batches: [
      { name: 'NEO Morning', section: 'N1', type: 'hybrid' }
    ]
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI.split('@')[1]?.split('/')[0]);

  // 1️⃣ Upsert Institute
  let institute = await Institute.findOne({ subdomain: 'skdinstitute' });
  if (!institute) {
    institute = await Institute.create({
      name: 'SKD Institute',
      subdomain: 'skdinstitute',
      domain: 'skdinstitute.com',
      logoUrl: '/SKD-logo.png',
      planType: 'premium',
      contactEmail: 'admin@skdinstitute.com',
      contactPhone: '+91-9876543210',
      address: 'Lucknow, Uttar Pradesh, India',
      settings: {
        features: { liveClasses: true, paymentGateway: false, smsNotifications: true },
        branding: { primaryColor: '#0033a0', secondaryColor: '#7b3fa0' }
      }
    });
    console.log('🏫 Institute created:', institute.name, '| ID:', institute._id);
  } else {
    console.log('🏫 Institute already exists:', institute.name, '| ID:', institute._id);
  }

  // 2️⃣ Upsert Admin User
  const adminEmail = 'admin@skdinstitute.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('Admin@123', salt);
    admin = await User.create({
      instituteId: institute._id,
      firstName: 'SKD',
      lastName: 'Admin',
      email: adminEmail,
      password: hashed,
      phone: '9876543210',
      role: 'admin',
    });
    console.log('👤 Admin user created | Email:', adminEmail, '| Password: Admin@123');
  } else {
    console.log('👤 Admin already exists:', adminEmail);
  }

  // 3️⃣ Seed Courses & Batches
  for (const courseData of COURSES) {
    const { batches, ...cData } = courseData;
    let course = await Course.findOne({ instituteId: institute._id, name: cData.name });
    if (!course) {
      course = await Course.create({ ...cData, instituteId: institute._id });
      console.log('🎓 Course created:', cData.name);
    } else {
      console.log('🎓 Course already exists:', cData.name);
    }

    for (const bData of batches) {
      const existingBatch = await Batch.findOne({ instituteId: institute._id, courseId: course._id, name: bData.name, section: bData.section });
      if (!existingBatch) {
        await Batch.create({ ...bData, instituteId: institute._id, courseId: course._id });
        console.log('  ↳ 📚 Batch created:', bData.name);
      } else {
        console.log('  ↳ 📚 Batch already exists:', bData.name);
      }
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Admin Login URL : http://localhost:3000/skd-admin');
  console.log('Email          : admin@skdinstitute.com');
  console.log('Password       : Admin@123');
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
