import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../service/supabase";
import { useCart } from "../context/CartContext";
import "../styles/Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);

  const { cartCount } = useCart();

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

                {cartCount > 0 && (
                  <span className="cart-badge">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
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

                {cartCount > 0 && (
                  <span className="cart-badge">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </>
          )}

        </div>
      </div>
    </header>
  );
}

export default Navbar;