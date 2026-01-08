"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackUrl?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallbackUrl = "/login",
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(fallbackUrl);
        return;
      }

      if (requiredRole && profile) {
        const roleHierarchy: Record<UserRole, number> = {
          universal_admin: 3,
          group_admin: 2,
          user: 1,
        };

        const hasPermission =
          roleHierarchy[profile.user_role] >= roleHierarchy[requiredRole];

        if (!hasPermission) {
          router.push("/");
        }
      }
    }
  }, [user, profile, loading, requiredRole, router, fallbackUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && profile) {
    const roleHierarchy: Record<UserRole, number> = {
      universal_admin: 3,
      group_admin: 2,
      user: 1,
    };

    const hasPermission =
      roleHierarchy[profile.user_role] >= roleHierarchy[requiredRole];

    if (!hasPermission) {
      return null;
    }
  }

  return <>{children}</>;
}
