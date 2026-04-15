/**
 * Maps plant status database values to display names
 */
export const statusDisplayMap = {
  healthy: "Healthy",
  needs_water: "Needs Water",
  diseased: "Diseased",
  dormant: "Dormant",
};

/**
 * Get the display name for a plant status
 * @param {string} status - The status value from the database
 * @returns {string} - The display name
 */
export const getStatusDisplay = (status) => {
  return statusDisplayMap[status] || status;
};
