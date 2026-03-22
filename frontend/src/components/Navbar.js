import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { t, language, setLanguage, languages } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: t("navbar.home") },
    { to: "/about", label: t("navbar.about") },
    { to: "/upload", label: t("navbar.upload") },
    { to: "/chatbot", label: t("navbar.aiChat") },
  ];

  const handleLogout = () => {
    logout();
    // Ensure user is directed to login page after logout and full refresh
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <ul>
        <li className="navbar-brand">
          <img src={logo} alt="logo" />
          <h1>{t("navbar.brand")}</h1>
        </li>
        <li className="navbar-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-button${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="language-switcher">
            <label htmlFor="language-select">{t("navbar.language")}</label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="welcome-user">
                  {t("navbar.welcome")}, {user?.username}
                </span>
                <button onClick={handleLogout} className="logout-button">
                  {t("navbar.logout")}
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <NavLink to="/login" className="auth-button login-button">
                  {t("navbar.login")}
                </NavLink>
                <NavLink to="/signup" className="auth-button signup-button">
                  {t("navbar.signup")}
                </NavLink>
              </div>
            )}
          </div>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
