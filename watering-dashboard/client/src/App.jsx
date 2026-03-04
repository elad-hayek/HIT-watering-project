import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import HomeAfterLogin from "./components/Home_AfterLogin";
import User from "./components/user";
import Notification from "./components/notification";
import Header from "./components/Header";
import Register from "./components/Register";
import Login from "./components/LoginPage";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route
          path="/"
          element={user ? <HomeAfterLogin user={user} /> : <Home />}
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
          element={user ? <Notification /> : <Navigate to="/login" />}
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
