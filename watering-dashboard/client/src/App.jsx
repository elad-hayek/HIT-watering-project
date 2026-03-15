import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import HomeAfterLogin from "./components/Home_AfterLogin";
import User from "./components/user";
import Notification from "./components/notification";
import Activity from "./components/Activity";
import Header from "./components/Header";
import Register from "./components/Register";
import Login from "./components/LoginPage";
import UserManagement from "./components/UserManagement";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  // Helper to check if user has permission to view activity
  const canViewActivity = () => {
    return user && (user.role === "area_manager" || user.role === "admin");
  };

  // Helper to check if user is admin
  const isAdmin = () => {
    return user && user.role === "admin";
  };

  return (
    <div className="app">
      <Header
        user={user}
        setUser={setUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <Routes>
        <Route
          path="/"
          element={user ? <HomeAfterLogin user={user} /> : <Home />}
        />
        <Route
          path="/activity"
          element={
            canViewActivity() ? (
              <Activity user={user} />
            ) : user ? (
              <Navigate to="/" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/user-management"
          element={
            isAdmin() ? (
              <UserManagement user={user} />
            ) : user ? (
              <Navigate to="/" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/user"
          element={
            user ? (
              <User user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/notification"
          element={
            user ? <Notification user={user} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}
