
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import "../styles/Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          Marketplace
        </Link>

        <nav className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
        </nav>

        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/profile" className="signin-btn">
                Account
              </Link>

              <Link
                to="/cart"
                className="cart-btn"
                aria-label="Shopping cart"
              >
                🛒
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="signup-btn"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="signin-btn">
                Sign In
              </Link>

              <Link to="/signup" className="signup-btn">
                Sign Up
              </Link>

              <Link
                to="/cart"
                className="cart-btn"
                aria-label="Shopping cart"
              >
                🛒
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

