
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import Navbar from "../components/Navbar";
import "../styles/Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setUser(user);
      setLoading(false);
    }

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/", {
      replace: true,
    });
  };

  if (loading) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <p>Loading account...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar />

      <main className="featured">

        <p className="section-small">
          YOUR ACCOUNT
        </p>

        <h1>My Profile</h1>

        <div
          style={{
            marginTop: "30px",
            maxWidth: "700px",
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            border: "1px solid #eee",
          }}
        >
          <p className="section-small">
            EMAIL
          </p>

          <h2
            style={{
              marginTop: "8px",
              wordBreak: "break-word",
            }}
          >
            {user.email}
          </h2>

          <div
            style={{
              marginTop: "30px",
              paddingTop: "25px",
              borderTop: "1px solid #eee",
            }}
          >
            <p className="section-small">
              ACCOUNT ID
            </p>

            <p
              style={{
                marginTop: "8px",
                color: "#666",
                wordBreak: "break-all",
              }}
            >
              {user.id}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "30px",
            }}
          >
            <Link
              to="/orders"
              className="hero-button"
            >
              My Orders
            </Link>

            <Link
              to="/products"
              style={{
                display: "inline-block",
                padding: "13px 24px",
                border: "1px solid #111",
                color: "#111",
                textDecoration: "none",
                borderRadius: "8px",
              }}
            >
              Continue Shopping
            </Link>
          </div>

          <button
            onClick={handleLogout}
            style={{
              marginTop: "20px",
              padding: "12px 20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              color: "#c00",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>

      </main>
    </div>
  );
}

export default Profile;
