const mongoose = require('mongoose');
const InstituteModel = require('./institutes.model');
const UserModel = require('../users/users.model');
const { ROLES } = require('../../config/constants');

exports.createInstitute = async (payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create Institute
    const { adminFirstName, adminLastName, adminEmail, adminPassword, ...instituteData } = payload;
    const institute = new InstituteModel(instituteData);
    await institute.save({ session });

    // 2. Create the Super Admin (Owner) for this Institute
    const superAdmin = new UserModel({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: adminPassword,
      role: ROLES.SUPER_ADMIN,
      instituteId: institute._id,
      isActive: true
    });
    
    // We must pass the session to the save method
    await superAdmin.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return institute;
  } catch (error) {
    // Rollback transaction if any error occurs (e.g. duplicate email)
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.getAllInstitutes = async () => {
  return await InstituteModel.find();
};

exports.getInstituteById = async (id) => {
  return await InstituteModel.findById(id);
};

exports.updateInstitute = async (id, payload) => {
  return await InstituteModel.findByIdAndUpdate(id, payload, { new: true });
};

exports.deleteInstitute = async (id) => {
  return await InstituteModel.findByIdAndDelete(id);
};
