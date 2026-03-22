import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Auth.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);

    if (result.success) {
      // Clear all login fields after successful login
      setUsername("");
      setPassword("");
      setShowPassword(false);
      navigate("/upload");
    } else {
      setError(result.message);
      // Clear everything on failed login too (no values stored)
      setUsername("");
      setPassword("");
      setShowPassword(false);
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="SkinNet Logo" className="auth-logo" />
          <h1>{t("auth.welcome_title") || "Welcome to SkinNet"}</h1>
          <p className="auth-subtitle">
            {t("auth.login_prompt") || "Please log in to your account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              {t("auth.username_label") || "Username"}
            </label>
            <div className="input-wrapper">
              <i className="fas fa-user"></i>
              <input
                id="username"
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="password-header">
              <label htmlFor="password">
                {t("auth.password") || "Password"}
              </label>
              <a href="#forgot" className="forgot-password">
                {t("auth.forgot_password") || "Forgot Password?"}
              </a>
            </div>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <i
                  className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                />
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {t("messages.please_wait") || "Please wait..."}
              </>
            ) : (
              `${t("auth.login_now") || "LOG IN"} →`
            )}
          </button>
        </form>

        <div className="auth-divider"></div>

        <p className="auth-footer">
          <i className="fas fa-info-circle"></i>
          {t("auth.dont_have_account") || "Don't have an account?"}
          <Link to="/signup" className="auth-link">
            {t("auth.signup") || "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
