import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../service/supabase";
import "../styles/Signup.css";

function Signup() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSignup = async (e) => {
    e.preventDefault();

    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    const {
      data,
      error,
    } =
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

    if (error) {
      console.error(
        "Signup error:",
        error
      );

      setMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    const params =
      new URLSearchParams(
        location.search
      );

    const redirect =
      params.get("redirect");

    /*
      When email confirmation is enabled,
      Supabase normally returns no session.
    */

    if (!data.session) {
      navigate(
        `/confirm-email?email=${encodeURIComponent(
          cleanEmail
        )}${
          redirect
            ? `&redirect=${encodeURIComponent(
                redirect
              )}`
            : ""
        }`,
        {
          replace: true,
        }
      );

      return;
    }

    /*
      If email confirmation is disabled
      and Supabase creates a session,
      continue normally.
    */

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

  return (
    <div className="signup-page">
      <div className="signup-card">

        <div className="signup-header">
          <h1>
            Create your account
          </h1>

          <p>
            Join our marketplace today
          </p>
        </div>

        <form
          onSubmit={handleSignup}
        >
          <div className="signup-field">
            <label htmlFor="signup-email">
              Email
            </label>

            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="signup-password">
              Password
            </label>

            <div className="password-input-wrapper">
              <input
                id="signup-password"
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
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
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <div className="signup-field">
            <label htmlFor="signup-confirm-password">
              Confirm password
            </label>

            <div className="password-input-wrapper">
              <input
                id="signup-confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password again"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        {message && (
          <div className="signup-message">
            {message}
          </div>
        )}

        <div className="signup-footer">
          <span>
            Already have an account?
          </span>

          <Link
            to={`/login${
              location.search || ""
            }`}
          >
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Signup;