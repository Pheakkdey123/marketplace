import { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { supabase } from "../service/supabase";
import "../styles/AuthCallback.css";

function AuthCallback() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const [message, setMessage] =
    useState("Signing you in...");

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        setMessage(
          "Completing sign in..."
        );

        /*
         * Supabase automatically handles
         * the OAuth session from the URL.
         */

        const {
          data: {
            session,
          },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          console.error(
            "Auth callback error:",
            error
          );

          if (mounted) {
            setMessage(
              "Unable to complete sign in."
            );
          }

          setTimeout(() => {
            navigate("/login", {
              replace: true,
            });
          }, 1500);

          return;
        }

        if (!session?.user) {
          console.error(
            "No authenticated user found."
          );

          if (mounted) {
            setMessage(
              "Your sign in session could not be found."
            );
          }

          setTimeout(() => {
            navigate("/login", {
              replace: true,
            });
          }, 1500);

          return;
        }

        const user =
          session.user;

        console.log(
          "Authenticated user:",
          user
        );

        /*
         * Check the user's profile.
         */

        const {
          data: profile,
          error:
            profileError,
        } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Profile error:",
            profileError
          );

          /*
           * If the profile doesn't exist,
           * send the user to account setup.
           */
          if (mounted) {
            navigate(
              "/account-setup",
              {
                replace: true,
              }
            );
          }

          return;
        }

        /*
         * No profile yet.
         */

        if (!profile) {
          console.log(
            "No profile found."
          );

          if (mounted) {
            navigate(
              "/account-setup",
              {
                replace: true,
              }
            );
          }

          return;
        }

        /*
         * Profile exists.
         * Check completion.
         */

        if (
          profile.profile_completed ===
          true
        ) {
          navigate("/", {
            replace: true,
          });
        } else {
          navigate(
            "/account-setup",
            {
              replace: true,
            }
          );
        }

      } catch (error) {
        console.error(
          "Callback error:",
          error
        );

        if (mounted) {
          setMessage(
            "Something went wrong during sign in."
          );
        }

        setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 1500);
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-card">

        <div className="auth-callback-spinner" />

        <h1>
          Welcome
        </h1>

        <p>
          {message}
        </p>

      </div>
    </div>
  );
}

export default AuthCallback;