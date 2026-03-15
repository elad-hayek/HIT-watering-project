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
    admin: "👨‍💼 Manager",
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
    case "admin":
      return "permission-admin";
    default:
      return "permission-unknown";
  }
}

export default {
  hasUpdatePermission,
  hasReadPermission,
  getPermissionDisplay,
  getPermissionBadgeClass,
};
