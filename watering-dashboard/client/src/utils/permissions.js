/**
 * Frontend permission utilities for area-level access control
 */

/**
 * Check if a user has update permission for an area
 * @param {string} permission - Permission from area object ('read' or 'update')
 * @returns {boolean}
 */
export function hasUpdatePermission(permission) {
  return permission === "update";
}

/**
 * Check if a user has read permission for an area
 * @param {string} permission - Permission from area object
 * @returns {boolean}
 */
export function hasReadPermission(permission) {
  return permission === "read" || permission === "update";
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
      return "permission-area-manager";
    case "admin":
      return "permission-admin";
    default:
      return "permission-unknown";
  }
}

/**
 * Check if a user can manage area users
 * Only global admins and users with area_manager permission for the specific area can manage users
 * @param {string} globalRole - User's global role
 * @param {string} areaPermission - User's permission level for that specific area
 * @returns {boolean}
 */
export function canManageAreaUsers(globalRole, areaPermission) {
  // Only global admin or users with area_manager permission for this specific area
  return globalRole === "admin" || areaPermission === "area_manager";
}

/**
 * Check if a user can delete an area
 * Only admins and users with area_manager permission for the specific area can delete
 * @param {string} globalRole - User's global role
 * @param {string} areaPermission - User's permission level for that specific area
 * @returns {boolean}
 */
export function canDeleteArea(globalRole, areaPermission) {
  // Only global admin or users with area_manager permission for this specific area
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
