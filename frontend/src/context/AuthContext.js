import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const [loading, setLoading] = useState(!!localStorage.getItem("authToken"));
  const [error, setError] = useState(null);
  const API_URL = "http://localhost:8000/api";

  // On mount, verify token if it exists
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  // Verify token with backend
  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/verify/${token}`);
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error("Token verification failed:", err);
      setToken(null);
      setUser(null);
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (username, email, password, fullName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, {
        username,
        email,
        password,
        full_name: fullName,
      });

      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem("authToken", response.data.token);
      return { success: true, message: response.data.message };
    } catch (err) {
      const error = err.response?.data?.detail || "Signup failed";
      setError(error);
      return { success: false, message: error };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem("authToken", response.data.token);
      return { success: true, message: response.data.message };
    } catch (err) {
      const error = err.response?.data?.detail || "Login failed";
      setError(error);
      return { success: false, message: error };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
    setError(null);

    // Ensure full refresh to login state
    window.location.href = "/login";
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        signup,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
