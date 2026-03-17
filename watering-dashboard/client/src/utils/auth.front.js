// Authentication utilities for the frontend
import { API_BASE_URL } from "../config";

export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const register = async (
  username,
  password,
  name,
  lastname,
  title,
  city,
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, name, lastname, title, city }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, userId: data.userId };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const logout = () => {
  localStorage.removeItem("user");
};

export const getStoredUser = () => {
  const user = localStorage.getItem("user");
  if (user) {
    try {
      return JSON.parse(user);
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const isAuthenticated = () => {
  return getStoredUser() !== null;
};
