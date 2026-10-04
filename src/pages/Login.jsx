import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../service/supabase";
import "../styles/Login.css";

function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const getRedirect = () => {
    const params =
      new URLSearchParams(
        location.search
      );

    return params.get("redirect");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email: cleanEmail,
          password,
        }
      );

    if (error) {
      console.error(
        "Login error:",
        error
      );

      if (
        error.message
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        setMessage(
          "Please confirm your email before signing in."
        );
      } else {
        setMessage(
          "Invalid email or password."
        );
      }

      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage(
        "Unable to sign in. Please try again."
      );

      setLoading(false);
      return;
    }

    const redirect =
      getRedirect();

    if (redirect) {
      navigate(redirect, {
        replace: true,
      });
    } else {
      navigate("/", {
        replace: true,
      });
    }

    setLoading(false);
  };

  const handleGoogleLogin =
    async () => {
      setLoading(true);
      setMessage("");

      const redirect =
        getRedirect();

      const origin =
        window.location.origin;

      const callbackUrl =
        `${origin}/auth/callback`;

      const {
        error,
      } =
        await supabase.auth.signInWithOAuth(
          {
            provider: "google",

            options: {
              redirectTo:
                callbackUrl,

              queryParams: {
                access_type:
                  "offline",

                prompt:
                  "select_account",
              },
            },
          }
        );

      if (error) {
        console.error(
          "Google login error:",
          error
        );

        setMessage(
          error.message
        );

        setLoading(false);
      }
    };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>
            Welcome back
          </h1>

          <p>
            Sign in to your account
          </p>
        </div>

        <form
          onSubmit={handleLogin}
        >
          <div className="login-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <div className="login-password-label">
              <label htmlFor="password">
                Password
              </label>

              <Link
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            <div className="password-input-wrapper">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={
            handleGoogleLogin
          }
          disabled={loading}
        >
          <span className="google-icon">
            G
          </span>

          Continue with Google
        </button>

        {message && (
          <div className="login-message">
            {message}
          </div>
        )}

        <div className="login-footer">
          <span>
            Don't have an account?
          </span>

          <Link
            to={`/signup${
              location.search || ""
            }`}
          >
            Create an account
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;