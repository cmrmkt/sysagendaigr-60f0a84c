import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Types based on database schema
interface Profile {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  phone_country: string | null;
  avatar_url: string | null;
  can_create_events: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  subscription_status: string;
  country_code: string;
  trial_ends_at: string | null;
}

type AppRole = "super_admin" | "admin" | "leader" | "viewer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, phoneCountry: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Super Admin impersonation
  viewingAsOrganization: Organization | null;
  setViewingAsOrganization: (org: Organization | null) => void;
  effectiveOrganization: Organization | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Super Admin impersonation state
  const [viewingAsOrganization, setViewingAsOrganization] = useState<Organization | null>(null);

  // Computed values
  const isSuperAdmin = role === "super_admin";
  const isImpersonating = isSuperAdmin && viewingAsOrganization !== null;
  const effectiveOrganization = isImpersonating ? viewingAsOrganization : organization;

  // Fetch user data (profile, organization, role)
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Fetch role first so we know if admin
      let fetchedRole: AppRole | null = null;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData) {
        fetchedRole = roleData.role as AppRole;
        setRole(fetchedRole);
      }

      if (profileData) {
        setProfile(profileData as Profile);

        // All users read from the organizations table (sensitive credentials moved to organization_credentials)
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .single();
        if (orgData) setOrganization(orgData as Organization);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Clear all auth state
  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setRole(null);
    setViewingAsOrganization(null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer data fetching with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          clearAuthState();
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    phone: string,
    phoneCountry: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Call the auth-phone-login edge function
      const { data, error } = await supabase.functions.invoke("auth-phone-login", {
        body: { phone, phoneCountry, password },
      });

      if (error) {
        // Use warn instead of error to avoid triggering error overlays
        console.warn("Login failed:", error.message);
        try {
          const errorBody = error.context ? await error.context.json() : null;
          if (errorBody?.error) {
            return { success: false, error: errorBody.error };
          }
        } catch {
          // context.json() may fail if body was already consumed
        }
        if (data?.error) {
          return { success: false, error: data.error };
        }
        return { success: false, error: "Telefone ou senha incorretos. Verifique e tente novamente." };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      if (data?.session) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // Update local state
        setSession(data.session);
        setUser(data.user);
        setProfile(data.profile);
        setOrganization(data.organization);
        setRole(data.role);

        return { success: true };
      }

      return { success: false, error: "Resposta inesperada do servidor." };
    } catch (err) {
      console.error("Unexpected login error:", err);
      return { success: false, error: "Erro inesperado. Tente novamente." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      clearAuthState();
      queryClient.clear();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        role,
        isAuthenticated: !!session,
        isLoading,
        login,
        logout,
        // Super Admin impersonation
        viewingAsOrganization,
        setViewingAsOrganization,
        effectiveOrganization,
        isSuperAdmin,
        isImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
