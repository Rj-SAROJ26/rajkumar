import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Auth.css";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signup, isAuthenticated } = useAuth();
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

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.password_mismatch") || "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const result = await signup(
      username,
      email,
      password,
      fullName || username,
    );

    if (result.success) {
      navigate("/upload");
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="SkinNet Logo" className="auth-logo" />
          <h1>{t("auth.signup") || "Create Account"}</h1>
          <p className="auth-subtitle">
            {t("auth.have_account") || "Already have an account?"}
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
            <label htmlFor="fullName">
              {t("auth.full_name") || "Full Name"}
            </label>
            <div className="input-wrapper">
              <i className="fas fa-user-circle"></i>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">
              {t("auth.username_label") || "Username"}
            </label>
            <div className="input-wrapper">
              <i className="fas fa-at"></i>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john_doe"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">{t("auth.email") || "Email"}</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.password") || "Password"}</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t("auth.confirm_password") || "Confirm Password"}
            </label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {t("messages.please_wait") || "Please wait..."}
              </>
            ) : (
              `${t("auth.signup_now") || "CREATE ACCOUNT"} →`
            )}
          </button>
        </form>

        <div className="auth-divider"></div>

        <p className="auth-footer">
          <i className="fas fa-sign-in-alt"></i>
          {t("auth.have_account") || "Already have an account?"}
          <Link to="/login" className="auth-link">
            {t("auth.login") || "Log In"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
