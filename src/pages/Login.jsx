
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import "../styles/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Get the page the user wanted before login
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      navigate(redirect);
    } else {
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign In</h1>

        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && <p>{message}</p>}

        <p>
          Don't have an account?{" "}
          <Link to={`/signup${location.search}`}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

