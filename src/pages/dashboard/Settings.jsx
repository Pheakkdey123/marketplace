import { useEffect, useState } from "react";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/settings.css";

function Settings() {
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      setUser(user);

      setForm((current) => ({
        ...current,
        email: user.email || "",
      }));
    } catch (err) {
      console.error("Settings error:", err);
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    try {
      setSavingPassword(true);
      setError("");
      setSuccess("");

      if (!form.password) {
        throw new Error("Please enter a new password.");
      }

      if (form.password.length < 6) {
        throw new Error(
          "Password must be at least 6 characters."
        );
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: form.password,
        });

      if (updateError) throw updateError;

      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));

      setSuccess("Password updated successfully.");
    } catch (err) {
      console.error("Password update error:", err);
      setError(
        err.message || "Failed to update password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="dashboard-loading">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="dashboard-page-header">
        <div>
          <h2>Settings</h2>
          <p>
            Manage your seller account settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {success && (
        <div className="settings-success">
          {success}
        </div>
      )}

      {/* Account Information */}
      <div className="dashboard-card settings-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Account Information</h3>
            <p>
              Your current marketplace account
              information.
            </p>
          </div>
        </div>

        <div className="settings-content">
          <div className="settings-profile">
            <div className="settings-avatar">
              {user?.email
                ?.charAt(0)
                .toUpperCase() || "S"}
            </div>

            <div>
              <strong>
                {user?.email || "Seller"}
              </strong>

              <span>Seller Account</span>
            </div>
          </div>

          <div className="settings-info-grid">
            <div className="settings-info-item">
              <span>Email</span>
              <strong>
                {user?.email || "-"}
              </strong>
            </div>

            <div className="settings-info-item">
              <span>User ID</span>
              <strong className="settings-user-id">
                {user?.id || "-"}
              </strong>
            </div>

            <div className="settings-info-item">
              <span>Account Created</span>
              <strong>
                {user?.created_at
                  ? new Date(
                      user.created_at
                    ).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )
                  : "-"}
              </strong>
            </div>

            <div className="settings-info-item">
              <span>Login Provider</span>
              <strong>
                {user?.app_metadata
                  ?.provider || "Email"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="dashboard-card settings-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Email Address</h3>
            <p>
              Your login email address.
            </p>
          </div>
        </div>

        <div className="settings-content">
          <div className="settings-field">
            <label>Email</label>

            <input
              type="email"
              value={form.email}
              disabled
            />

            <small>
              Email changes are disabled here.
              You can manage email changes through
              your account authentication flow.
            </small>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="dashboard-card settings-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Change Password</h3>
            <p>
              Update your account password.
            </p>
          </div>
        </div>

        <form
          className="settings-content"
          onSubmit={handleUpdatePassword}
        >
          <div className="settings-password-grid">
            <div className="settings-field">
              <label>
                New Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div className="settings-field">
              <label>
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="settings-password-actions">
            <button
              type="submit"
              className="dashboard-btn dashboard-btn-primary"
              disabled={savingPassword}
            >
              {savingPassword
                ? "Updating..."
                : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="dashboard-card settings-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Security</h3>
            <p>
              Information about your current
              authentication session.
            </p>
          </div>
        </div>

        <div className="settings-security">
          <div className="settings-security-item">
            <div className="settings-security-icon">
              ✓
            </div>

            <div>
              <strong>
                Authentication Active
              </strong>

              <span>
                Your marketplace session is
                authenticated through Supabase.
              </span>
            </div>
          </div>

          <div className="settings-security-item">
            <div className="settings-security-icon">
              🔒
            </div>

            <div>
              <strong>
                Account Protected
              </strong>

              <span>
                Seller data is protected by
                database access policies.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;