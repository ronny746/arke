// These are the only account roles supported by ARKE.  Keep this list small
// because it is also used by the User schema to validate persisted accounts.
const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent'
};

// Temporary source-compatibility aliases. They deliberately resolve to
// `admin`, are non-enumerable, and therefore can never become valid persisted
// roles through Object.values(ROLES). Remove usages module-by-module.
Object.defineProperties(ROLES, {
  SUPER_ADMIN: { value: ROLES.ADMIN },
  SUPER_SUPER_ADMIN: { value: ROLES.ADMIN },
  ADMIN_ACADOPS: { value: ROLES.ADMIN },
  ADMIN_OPERATIONS: { value: ROLES.ADMIN },
  STAFF: { value: ROLES.ADMIN }
});

module.exports = { ROLES: Object.freeze(ROLES) };
