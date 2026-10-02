import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../service/supabase";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const location = useLocation();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    }

    checkUser();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          location.pathname
        )}`}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;