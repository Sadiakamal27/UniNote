"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    username: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Track current user ID to prevent redundant SIGNED_IN events
  const currentUserIdRef = useRef<string | null>(null);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }
  };

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  // Initialize auth state - only runs once on mount
  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;
    let subscription: { unsubscribe: () => void } | null = null;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted || hasInitialized) return;
        hasInitialized = true;

        if (error) {
          console.error("Error getting session:", error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        currentUserIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        // Skip INITIAL_SESSION event if we already handled it via getSession
        if (event === "INITIAL_SESSION" && hasInitialized) {
          return;
        }

        // Skip token refresh events - they don't change the user
        if (event === "TOKEN_REFRESHED") {
          setSession(session);
          return;
        }

        // Skip SIGNED_IN events if we already have a user with the same ID
        // This prevents unnecessary re-renders when the tab becomes active
        if (
          event === "SIGNED_IN" &&
          currentUserIdRef.current &&
          session?.user?.id === currentUserIdRef.current
        ) {
          console.log(
            "Auth state changed: SIGNED_IN (skipped - already signed in)",
            {
              currentUserId: currentUserIdRef.current,
              sessionUserId: session?.user?.id,
            }
          );
          return;
        }

        console.log("Auth state changed:", event, {
          currentUserId: currentUserIdRef.current,
          newUserId: session?.user?.id,
          willUpdateState: true,
        });
        setSession(session);
        setUser(session?.user ?? null);
        currentUserIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        if (isMounted) {
          setLoading(false);
        }

        // Handle redirects
        if (event === "SIGNED_IN") {
          if (window.location.pathname === "/login") {
            router.push("/");
          }
        } else if (event === "SIGNED_OUT") {
          if (window.location.pathname !== "/login") {
            router.push("/login");
          }
        }
      }
    );

    subscription = authSubscription;

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only initialize once on mount

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  // Sign up function
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      username: string
    ) => {
      try {
        // First, check if username is already taken
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          return { error: checkError };
        }

        if (existingUser) {
          return { error: { message: "Username is already taken" } };
        }

        // Create the auth user
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username.toLowerCase(),
            },
          },
        });

        return { error };
      } catch (error) {
        return { error };
      }
    },
    []
  );

  // Sign out function
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, profile, session, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
