import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import Navbar from "../components/Navbar";
import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);

      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    } catch (err) {
      console.error("Profile error:", err);
      setError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);

      setMessage("Profile updated successfully.");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error("Update profile error:", err);
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function getInitial() {
    if (fullName) {
      return fullName.charAt(0).toUpperCase();
    }

    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return "U";
  }

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <div className="profile-container">

          {/* Header */}
          <div className="profile-header">
            <div>
              <h1>My Profile</h1>
              <p>
                Manage your personal information and account settings.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="profile-alert profile-alert-error">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="profile-alert profile-alert-success">
              {message}
            </div>
          )}

          <div className="profile-layout">

            {/* Left Profile Card */}
            <section className="profile-card profile-summary">

              <div className="profile-avatar">
                {getInitial()}
              </div>

              <h2>
                {fullName || "User"}
              </h2>

              <p className="profile-email">
                {user?.email}
              </p>

              <div className="profile-status">
                <span className="profile-status-dot"></span>
                Account Active
              </div>

              <div className="profile-summary-line"></div>

              <div className="profile-summary-item">
                <span>Account</span>
                <strong>Customer</strong>
              </div>

              <div className="profile-summary-item">
                <span>Email</span>
                <strong>
                  {user?.email ? "Verified" : "Not verified"}
                </strong>
              </div>

              <button
                type="button"
                className="profile-logout"
                onClick={handleLogout}
              >
                Logout
              </button>

            </section>

            {/* Right Edit Card */}
            <section className="profile-card profile-edit">

              <div className="profile-section-header">
                <div>
                  <h2>Personal Information</h2>
                  <p>Update your account information.</p>
                </div>
              </div>

              <form onSubmit={handleSave}>

                {/* Full Name */}
                <div className="profile-form-group">
                  <label htmlFor="fullName">
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="profile-form-group">
                  <label htmlFor="email">
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                  />

                  <small>
                    Your email address is managed by your login account.
                  </small>
                </div>

                {/* Phone */}
                <div className="profile-form-group">
                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Address */}
                <div className="profile-form-group">
                  <label htmlFor="address">
                    Address
                  </label>

                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address"
                    rows="4"
                  />
                </div>

                {/* Buttons */}
                <div className="profile-actions">

                  <button
                    type="button"
                    className="profile-btn profile-btn-cancel"
                    onClick={() => navigate("/home")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-btn profile-btn-save"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                </div>

              </form>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}

export default Profile;