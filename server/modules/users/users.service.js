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
exports.getDistinctClasses = async (reqUser) => {
  const query = { role: ROLES.STUDENT };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  const classes = await UserModel.distinct('metadata.class', query);
  // Filter out any empty/null strings and sort
  return classes.filter(Boolean).sort();
};

exports.getDistinctSections = async (reqUser, className) => {
  const query = { role: ROLES.STUDENT, 'metadata.class': className };
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  const sections = await UserModel.distinct('metadata.section', query);
  return sections.filter(Boolean).sort();
};

exports.getAllUsers = async (reqUser, query = {}) => {
  // If not super_super_admin, enforce tenant isolation
  if (reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  
  // If a teacher is requesting the list of students, only return students from their assigned batches
  if (reqUser.role === 'teacher' && (query.role === 'student' || !query.role)) {
    const BatchModel = require('../batches/batches.model');
    const teacherBatches = await BatchModel.find({
      instituteId: reqUser.instituteId,
      $or: [{ batchTeacherId: reqUser.userId }, { teachers: reqUser.userId }]
    });
    
    const studentIds = new Set();
    teacherBatches.forEach(batch => {
      batch.students.forEach(studentId => studentIds.add(studentId.toString()));
    });
    
    // Only return students that are in the teacher's batches
    query._id = { $in: Array.from(studentIds) };
  }

  // If a student is requesting the list of teachers, only return teachers from their enrolled batches
  if (reqUser.role === 'student' && query.role === 'teacher') {
    const BatchModel = require('../batches/batches.model');
    const studentBatches = await BatchModel.find({
      instituteId: reqUser.instituteId,
      students: reqUser.userId
    });
    
    const teacherIds = new Set();
    studentBatches.forEach(batch => {
      if (batch.batchTeacherId) teacherIds.add(batch.batchTeacherId.toString());
      if (batch.teachers) {
        batch.teachers.forEach(tid => teacherIds.add(tid.toString()));
      }
    });
    
    // Only return teachers that are in the student's batches
    query._id = { $in: Array.from(teacherIds) };
  }

  let queryBuilder = UserModel.find(query).select('-password');
  
  if (query.role === ROLES.PARENT || query.role === 'parent') {
    queryBuilder = queryBuilder.populate('childrenIds', 'firstName lastName metadata profilePictureUrl');
  }

  
  return await queryBuilder.exec();
};

exports.getUserById = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser && reqUser.role !== ROLES.SUPER_SUPER_ADMIN) {
    query.instituteId = reqUser.instituteId;
  }
  
  let queryBuilder = UserModel.findOne(query).select('-password');
  
  // If we are fetching a parent profile, populate their children to show on the dashboard
  if (reqUser && reqUser.role === ROLES.PARENT) {
    queryBuilder = queryBuilder.populate('childrenIds', 'firstName lastName email phone metadata profilePictureUrl');
  }
  
  return await queryBuilder.exec();
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

const xlsx = require('xlsx');

exports.importStudentsFromExcel = async (buffer, reqUser) => {
  return new Promise(async (resolve, reject) => {
    const errors = [];
    let successful = 0;
    let failed = 0;

    try {
      // Parse the Excel file from buffer
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to JSON (skipping the first row if it's the title, headers are usually on row 2)
      // xlsx.utils.sheet_to_json handles header finding. If row 1 is title and row 2 is headers:
      // A safe way is to get as array of arrays, find the header row, then map.
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Find the row that contains 'Roll number' or 'Name' to identify headers
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.some(cell => cell && typeof cell === 'string' && (cell.toLowerCase().includes('roll number') || cell.toLowerCase().includes('name')))) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawData[headerRowIdx].map(h => h ? h.toString().trim().toLowerCase() : '');
      const results = [];

      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const rowData = rawData[i];
        // Skip empty rows
        if (!rowData || rowData.length === 0 || !rowData.some(Boolean)) continue;
        
        const row = {};
        headers.forEach((header, index) => {
          if (header) {
            row[header] = rowData[index] ? rowData[index].toString().trim() : '';
          }
        });
        results.push({ rowNumber: i + 1, data: row });
      }

      for (const item of results) {
        try {
          const { rowNumber, data } = item;
          
          // Map headers to standard keys based on the provided screenshot
          // Headers: Roll number, Name, Mobile Number, Class, Section, State, City, Email, Parent Name, Parent Mobile Number, Center
          const rollNo = data['roll number'] || data['roll_no'] || data['roll no'] || data['roll no.'];
          const name = data['name'];
          const mobile = data['mobile number'] || data['mobile_no'];
          const studentClass = data['class'];
          const section = data['section'];
          const state = data['state'];
          const city = data['city'];
          const rawEmail = data['email'];
          const parentName = data['parent name'];
          const parentMobile = data['parent mobile number'];
          const center = data['center'];
          
          // Required fields check based on the sheet
          if (!rollNo || !name) {
            errors.push({ row: rowNumber, error: 'Missing required fields (Roll number, Name)' });
            failed++;
            continue;
          }

          const email = rawEmail ? rawEmail : undefined;

          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || ' ';
          let instituteId = reqUser.instituteId;

          const newMetadata = {
            rollNo: rollNo,
            class: studentClass,
            section: section,
            state: state,
            city: city,
            parentName: parentName,
            parentPhone: parentMobile,
            center: center,
            status: 'active'
          };

          let user;
          const queryOr = [{ 'metadata.rollNo': rollNo }];
          if (email) queryOr.push({ email: email });
          
          const existingUser = await UserModel.findOne({ $or: queryOr });

          if (existingUser) {
            // Update existing user
            if (firstName) existingUser.firstName = firstName;
            if (lastName) existingUser.lastName = lastName;
            if (mobile) existingUser.phone = mobile;
            
            // Merge metadata
            existingUser.metadata = {
              ...(existingUser.metadata || {}),
              ...newMetadata
            };
            
            user = existingUser;
            await user.save();
          } else {
            // Create new user
            const payload = {
              firstName,
              lastName,
              email: email,
              password: 'password123', // Default password
              role: ROLES.STUDENT,
              phone: mobile,
              instituteId,
              metadata: newMetadata
            };

            user = new UserModel(payload);
            await user.save();
          }


          // Create and Link Parent Account
          if (parentMobile) {
            let parentUser = await UserModel.findOne({ phone: parentMobile, role: ROLES.PARENT });
            
            if (!parentUser) {
              const pNameParts = parentName ? parentName.split(' ') : ['Parent'];
              const pFirstName = pNameParts[0];
              const pLastName = pNameParts.slice(1).join(' ') || ' ';
              const pEmail = undefined;
              
              parentUser = new UserModel({
                firstName: pFirstName,
                lastName: pLastName,
                email: pEmail,
                password: 'password123',
                role: ROLES.PARENT,
                phone: parentMobile,
                instituteId,
                childrenIds: [user._id]
              });
              await parentUser.save();
            } else {
              if (!parentUser.childrenIds.includes(user._id)) {
                parentUser.childrenIds.push(user._id);
                await parentUser.save();
              }
            }
            
            // Link parent back to student
            user.parentId = parentUser._id;
            await user.save();
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
    } catch (err) {
      reject(err);
    }
  });
};
