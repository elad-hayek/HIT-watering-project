/**
 * RBAC Middleware for Express
 * Middleware functions to check permissions in routes
 */

const { hasRolePrivilege, ROLES } = require("./rbac");

/**
 * Middleware to require user authentication (has user context)
 */
function requireAuth(req, res, next) {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (!userId || !userRole) {
    return res
      .status(401)
      .json({ error: "Unauthorized: missing user context" });
  }

  req.userId = parseInt(userId);
  req.userRole = userRole;
  next();
}

/**
 * Middleware to require a specific role or higher
 * @param {string} requiredRole - Minimum required role
 * @returns {function} - Express middleware
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (!userId || !userRole) {
      return res
        .status(401)
        .json({ error: "Unauthorized: missing user context" });
    }

    if (!hasRolePrivilege(userRole, requiredRole)) {
      return res.status(403).json({
        error: "Forbidden: insufficient permissions",
        required: requiredRole,
        current: userRole,
      });
    }

    req.userId = parseInt(userId);
    req.userRole = userRole;
    next();
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware to require area manager or admin role
 */
function requireAreaManager(req, res, next) {
  return requireRole(ROLES.AREA_MANAGER)(req, res, next);
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAreaManager,
};
