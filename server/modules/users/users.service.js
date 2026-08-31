const UserModel = require('./users.model');
const { ROLES } = require('../../config/constants');

exports.createUser = async (reqUser, payload) => {
  // Associate user with the same institute as the admin who is creating them, 
  // unless the creator is a SUPER_SUPER_ADMIN who provides an explicit instituteId.
  let instituteId = reqUser.instituteId;
  if (reqUser.role === ROLES.SUPER_SUPER_ADMIN && payload.instituteId) {
    instituteId = payload.instituteId;
  }
  
  const user = new UserModel({
    ...payload,
    instituteId
  });
  
  return await user.save();
};

exports.getAllUsers = async (reqUser, query = {}) => {
  // If not super_super_admin, enforce tenant isolation
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  return await UserModel.find(query).select('-password');
};

exports.getUserById = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  return await UserModel.findOne(query).select('-password');
};

exports.updateUser = async (id, payload, reqUser) => {
  const query = { _id: id };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  return await UserModel.findOneAndUpdate(query, payload, { new: true }).select('-password');
};

exports.deleteUser = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  return await UserModel.findOneAndDelete(query);
};

exports.linkParentStudent = async (parentId, studentId, reqUser) => {
  const queryBase = reqUser.role === ROLES.SUPER_SUPER_ADMIN ? {} : { instituteId: reqUser.instituteId };
  
  const parent = await UserModel.findOne({ _id: parentId, role: 'parent', ...queryBase });
  const student = await UserModel.findOne({ _id: studentId, role: 'student', ...queryBase });

  if (!parent || !student) {
    throw new Error('Parent or Student not found, or roles mismatch');
  }

  // Bidirectional link
  await UserModel.findByIdAndUpdate(studentId, { $set: { parentId: parent._id } });
  return await UserModel.findByIdAndUpdate(parentId, { $addToSet: { childrenIds: student._id } }, { new: true })
    .populate('childrenIds', 'firstName lastName email');
};

exports.setupParentProfile = async (studentId, payload) => {
  const student = await UserModel.findById(studentId).select('+password');
  if (!student) throw new Error('Student not found');
  if (student.parentId) throw new Error('A parent is already linked to this student');

  // Check if email is already taken
  const existingUser = await UserModel.findOne({ email: payload.email });
  if (existingUser) throw new Error('Email is already registered');

  // Create parent with temporary password to pass validation
  const parent = await UserModel.create({
    ...payload,
    role: 'parent',
    password: 'TemporaryPassword@123',
    instituteId: student.instituteId,
    childrenIds: [student._id]
  });

  // Overwrite the password hash directly bypassing the pre-save hook
  await UserModel.updateOne({ _id: parent._id }, { $set: { password: student.password } });

  // Update student with parentId
  await UserModel.updateOne({ _id: student._id }, { $set: { parentId: parent._id } });

  return parent;
};

const csv = require('csv-parser');
const streamifier = require('streamifier');

exports.importStudentsFromCSV = async (buffer, reqUser) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowCount = 0;

    streamifier.createReadStream(buffer)
      .pipe(csv())
      .on('data', (data) => {
        rowCount++;
        // Normalize keys (trim whitespace, lowercase)
        const row = {};
        for (const key in data) {
          row[key.trim().toLowerCase()] = data[key]?.trim();
        }
        results.push({ rowNumber: rowCount, data: row });
      })
      .on('end', async () => {
        let successful = 0;
        let failed = 0;

        for (const item of results) {
          try {
            const { rowNumber, data } = item;
            
            // Required fields check (email, qr_id, face_id are optional)
            if (!data.roll_no || !data.name || !data.class || !data.section || !data.mobile_no || !data.dob || !data.rfid) {
              errors.push({ row: rowNumber, error: 'Missing required fields (roll_no, name, class, section, mobile_no, dob, rfid)' });
              failed++;
              continue;
            }

            // Generate dummy email if not provided
            const email = data.email ? data.email : `${data.roll_no}@student.local`;

            // Check if user already exists
            const existingUser = await UserModel.findOne({
              $or: [{ email: email }, { 'metadata.rollNo': data.roll_no }]
            });

            if (existingUser) {
              errors.push({ row: rowNumber, error: 'User with this email or roll_no already exists' });
              failed++;
              continue;
            }

            const nameParts = data.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || ' ';

            let instituteId = reqUser.instituteId;

            const payload = {
              firstName,
              lastName,
              email: email,
              password: '12345678', // Default password
              role: ROLES.STUDENT,
              phone: data.mobile_no,
              rfid: data.rfid,
              qrId: data.qr_id || '',
              faceId: data.face_id || '',
              instituteId,
              metadata: {
                rollNo: data.roll_no,
                class: data.class,
                section: data.section,
                dob: data.dob,
                status: 'active'
              }
            };

            const user = new UserModel(payload);
            await user.save();
            
            // Link to AcademicClass
            const AcademicClassModel = require('../academic-classes/academic-classes.model');
            let academicClass = await AcademicClassModel.findOne({
              instituteId,
              name: data.class,
              section: data.section
            });

            if (!academicClass) {
              academicClass = new AcademicClassModel({
                instituteId,
                name: data.class,
                section: data.section,
                students: [user._id]
              });
              await academicClass.save();
            } else {
              // Add if not already in array
              if (!academicClass.students.includes(user._id)) {
                academicClass.students.push(user._id);
                await academicClass.save();
              }
            }

            successful++;

          } catch (err) {
            errors.push({ row: item.rowNumber, error: err.message });
            failed++;
          }
        }

        resolve({
          total: results.length,
          successful,
          failed,
          errors
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};
