"use client";

import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/lib/supabase";

export function useUserRole() {
  const { profile, loading } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    if (!profile) return false;

    const roleHierarchy: Record<UserRole, number> = {
      universal_admin: 3,
      group_admin: 2,
      user: 1,
    };

    return roleHierarchy[profile.user_role] >= roleHierarchy[role];
  };

  const isUniversalAdmin = (): boolean => {
    return profile?.user_role === "universal_admin";
  };

  const isGroupAdmin = (): boolean => {
    return profile?.user_role === "group_admin" || isUniversalAdmin();
  };

  const isUser = (): boolean => {
    return !!profile;
  };

  return {
    role: profile?.user_role,
    loading,
    hasRole,
    isUniversalAdmin,
    isGroupAdmin,
    isUser,
  };
}
