/**
 * Role-based Access Control (RBAC) Utilities
 * Handles role hierarchy, permissions checking, and access control
 */

// Role hierarchy levels (higher number = more privilege)
const ROLE_HIERARCHY = {
  user: 1,
  admin: 2,
};

const ROLES = {
  USER: "user",
  ADMIN: "admin",
};

/**
 * Check if a user role has a higher or equal privilege level than required
 * @param {string} userRole - The user's current role
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} - True if user has sufficient privilege
 */
function hasRolePrivilege(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if a user can assign a role to another user
 * Role assignment rules:
 * - Admin can assign user or admin role
 * - User cannot assign any role
 * @param {string} assignerRole - The role of the user doing the assignment
 * @param {string} targetRole - The role being assigned
 * @returns {boolean}
 */
function canAssignRole(assignerRole, targetRole) {
  // Only admin can assign roles
  if (assignerRole !== ROLES.ADMIN) {
    return false;
  }

  // Admin can assign user or admin roles
  return targetRole === ROLES.USER || targetRole === ROLES.ADMIN;
}

/**
 * Get the list of roles that a user can assign
 * @param {string} userRole - The user's current role
 * @returns {array} - Array of assignable role names
 */
function getAssignableRoles(userRole) {
  if (userRole === ROLES.ADMIN) {
    return [ROLES.USER, ROLES.ADMIN];
  }
  return [];
}

/**
 * Check if a user can view activity
 * @param {string} role - User's role
 * @returns {boolean}
 */
function canViewActivity(role) {
  return role === ROLES.ADMIN;
}

/**
 * Check if a user can create/edit areas
 * @param {string} role - User's role
 * @returns {boolean}
 */
function canManageAreas(role) {
  return role === ROLES.ADMIN;
}

/**
 * Check if a user can view all areas (admin only)
 * @param {string} role - User's role
 * @returns {boolean}
 */
function canViewAllAreas(role) {
  return role === ROLES.ADMIN;
}

/**
 * Check if a user can manage users (admin only)
 * @param {string} role - User's role
 * @returns {boolean}
 */
function canManageUsers(role) {
  return role === ROLES.ADMIN;
}

/**
 * Get role display name
 * @param {string} role - Role key
 * @returns {string} - Display name
 */
function getRoleDisplayName(role) {
  const displayNames = {
    user: "User",
    admin: "Administrator",
  };
  return displayNames[role] || role;
}

/**
 * Check if a user has specific permission on an area
 * Rules:
 * - Admin: always has 'update' permission
 * - Area Manager: permission is determined by user_area_mapping record
 * - User: permission is determined by user_area_mapping record (usually 'read' only)
 * @param {string} userRole - User's role
 * @param {string} areaPermission - Permission from user_area_mapping ('read' or 'update')
 * @returns {boolean} - True if user has update permission
 */
function hasAreaUpdatePermission(userRole, areaPermission) {
  // Admin always has update permission
  if (userRole === ROLES.ADMIN) {
    return true;
  }
  // Check if permission is 'update'
  return areaPermission === "update";
}

/**
 * Check if a user has read permission on an area
 * Rules:
 * - Admin: always has read permission
 * - User: if assigned to area, they have read permission
 * @param {string} userRole - User's role
 * @returns {boolean} - True if user can read the area
 */
function hasAreaReadPermission(userRole) {
  // Anyone assigned to an area can read it
  return userRole === ROLES.ADMIN || userRole === ROLES.USER;
}

/**
 * Check if a user can delete an area
 * Only admins can delete areas
 * @param {string} userRole - User's role
 * @returns {boolean}
 */
function canDeleteArea(userRole) {
  return userRole === ROLES.ADMIN;
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  hasRolePrivilege,
  canAssignRole,
  getAssignableRoles,
  canViewActivity,
  canManageAreas,
  canViewAllAreas,
  canManageUsers,
  getRoleDisplayName,
  hasAreaUpdatePermission,
  hasAreaReadPermission,
  canDeleteArea,
};
