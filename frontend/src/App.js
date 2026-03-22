import React from "react";
import "./App.css";
import { HashRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Navbar from "./components/Navbar";
import HomePage from "./components/Home";
import Apage from "./components/Ab";
import Upload from "./components/Upload";
import Chatbot from "./components/Chatbot";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";

// Layout component with navbar
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            {/* Auth Routes - No Navbar */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes - With Navbar Layout */}
            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={<ProtectedRoute element={<HomePage />} />}
              />
              <Route
                path="/about"
                element={<ProtectedRoute element={<Apage />} />}
              />
              <Route
                path="/upload"
                element={<ProtectedRoute element={<Upload />} />}
              />
              <Route
                path="/chatbot"
                element={<ProtectedRoute element={<Chatbot />} />}
              />
            </Route>
            {/* Fallback to login */}
            <Route
              path="*"
              element={<ProtectedRoute element={<HomePage />} />}
            />
          </Routes>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
