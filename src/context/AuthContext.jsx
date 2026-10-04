import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../service/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile
  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Profile loading error:",
        error
      );

      setProfile(null);
      return null;
    }

    setProfile(data);

    return data;
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);

        await loadProfile(
          session.user.id
        );
      } else {
        setUser(null);
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log(
          "Auth event:",
          event
        );

        if (session?.user) {
          setUser(session.user);

          // Don't immediately query profile
          // inside the auth event callback.
          setTimeout(() => {
            if (mounted) {
              loadProfile(
                session.user.id
              );
            }
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Sign out error:",
        error
      );

      throw error;
    }

    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return null;

    return await loadProfile(
      user.id
    );
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}