/**
 * Frontend permission utilities for area-level access control
 */

/**
 * Check if a user has update permission for an area
 * @param {string} permission - Permission from area object ('read', 'update', 'area_manager', or 'admin')
 * @returns {boolean}
 */
export function hasUpdatePermission(permission) {
  return (
    permission === "update" ||
    permission === "area_manager" ||
    permission === "admin"
  );
}

/**
 * Check if a user has read permission for an area
 * @param {string} permission - Permission from area object
 * @returns {boolean}
 */
export function hasReadPermission(permission) {
  return (
    permission === "read" ||
    permission === "update" ||
    permission === "area_manager" ||
    permission === "admin"
  );
}

/**
 * Get permission display text
 * @param {string} permission - Permission value
 * @returns {string}
 */
export function getPermissionDisplay(permission) {
  const displayMap = {
    read: "📖 Read Only",
    update: "✏️ Editor",
    area_manager: "👨‍💼 Area Manager",
    admin: "🔑 Admin",
  };
  return displayMap[permission] || "Unknown";
}

/**
 * Get permission badge class for styling
 * @param {string} permission - Permission value
 * @returns {string}
 */
export function getPermissionBadgeClass(permission) {
  switch (permission) {
    case "read":
      return "permission-read";
    case "update":
      return "permission-update";
    case "area_manager":
      return "permission-area_manager";
    case "admin":
      return "permission-admin";
    default:
      return "permission-unknown";
  }
}

/**
 * Check if a user can manage area users
 * Admins and area managers can manage users
 * @param {string} globalRole - User's global role
 * @param {string} areaPermission - User's permission level for that specific area
 * @returns {boolean}
 */
export function canManageAreaUsers(globalRole, areaPermission) {
  // Global admin can manage users in any area
  // Area managers can manage users in their areas
  return globalRole === "admin" || areaPermission === "area_manager";
}

/**
 * Check if a user can delete an area
 * Admins and area managers can delete
 * @param {string} globalRole - User's global role
 * @param {string} areaPermission - User's permission level for that specific area
 * @returns {boolean}
 */
export function canDeleteArea(globalRole, areaPermission) {
  // Global admin can delete any area
  // Area managers can delete their areas
  return globalRole === "admin" || areaPermission === "area_manager";
}

export default {
  hasUpdatePermission,
  hasReadPermission,
  getPermissionDisplay,
  getPermissionBadgeClass,
  canManageAreaUsers,
  canDeleteArea,
};
