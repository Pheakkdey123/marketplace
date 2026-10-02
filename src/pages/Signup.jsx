
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import "../styles/Signup.css";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Check where the user came from
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");

    // Email confirmation is required
    if (!data.session) {
      setMessage(
        "Account created. Please check your email to confirm your account."
      );

      setLoading(false);
      return;
    }

    // Supabase logged the user in immediately
    if (redirect) {
      navigate(redirect);
    } else {
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>Create Account</h1>

        <form onSubmit={handleSignup}>
          <div>
            <label htmlFor="signup-email">
              Email
            </label>

            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="signup-password">
              Password
            </label>

            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        {message && <p>{message}</p>}

        <p>
          Already have an account?{" "}
          <Link
            to={`/login${
              location.search
                ? location.search
                : ""
            }`}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
