import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/ProtectedRoute.css";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="protected-loading">
        <div className="protected-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    const redirect =
      location.pathname +
      location.search;

    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          redirect
        )}`}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;