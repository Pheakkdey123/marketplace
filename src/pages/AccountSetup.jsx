import { useState } from "react";
import {
  useNavigate,
} from "react-router-dom";

import { supabase } from "../service/supabase";
import { useAuth } from "../context/AuthContext";

import "../styles/AccountSetup.css";

function AccountSetup() {
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const navigate =
    useNavigate();

  const [fullName, setFullName] =
    useState(
      profile?.full_name || ""
    );

  const [phone, setPhone] =
    useState(
      profile?.phone || ""
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    setError("");

    if (!user) {
      setError(
        "You must be signed in."
      );
      return;
    }

    if (
      !fullName.trim()
    ) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    setLoading(true);

    const {
      error: updateError,
    } =
      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,

            full_name:
              fullName.trim(),

            phone:
              phone.trim() || null,

            profile_completed:
              true,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

    if (updateError) {
      console.error(
        "Profile update error:",
        updateError
      );

      setError(
        updateError.message
      );

      setLoading(false);

      return;
    }

    await refreshProfile();

    navigate("/", {
      replace: true,
    });
  };

  return (
    <div className="account-setup-page">
      <div className="account-setup-card">

        <div className="account-setup-header">
          <h1>
            Complete your account
          </h1>

          <p>
            Just a few details before
            you start shopping.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
        >
          <div className="account-setup-field">
            <label htmlFor="full-name">
              Full name
            </label>

            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) =>
                setFullName(
                  e.target.value
                )
              }
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="account-setup-field">
            <label htmlFor="phone">
              Phone number
              <span>
                Optional
              </span>
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
              placeholder="+855 XX XXX XXX"
              autoComplete="tel"
            />
          </div>

          <button
            type="submit"
            className="account-setup-button"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Continue"}
          </button>
        </form>

        {error && (
          <div className="account-setup-error">
            {error}
          </div>
        )}

        <p className="account-setup-email">
          Signed in as{" "}
          <strong>
            {user?.email}
          </strong>
        </p>

      </div>
    </div>
  );
}

export default AccountSetup;