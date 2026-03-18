// API Configuration
// Reads the base API URL from environment variables
// For development: http://localhost:3000
// For production: set REACT_APP_API_BASE_URL environment variable

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to construct API endpoints
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

const config = {
  API_BASE_URL,
  getApiUrl,
};

export default config;
