import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e0f2f7 0%, #f0f8fb 100%)",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <i
            className="fas fa-spinner fa-spin"
            style={{
              fontSize: "48px",
              color: "#0d47a1",
              marginBottom: "20px",
            }}
          ></i>
          <p
            style={{
              color: "#1a5f7a",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
